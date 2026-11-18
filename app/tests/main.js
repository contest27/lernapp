// Browser test runner. Open tests/tests.html via a local server; results render
// on the page, log to the console, and land on window.__testResults.
//
// Ported from powermath-trainer/app/tests/main.js for the Lernapp hub. The
// engine (rng/mastery/scheduler/check/progress) is a verbatim sync, so those
// tests are ported near-unchanged. Everything under maths/content and
// shell/storage is new to Lernapp, so those blocks are written fresh against
// the layout documented in the hub's handoff notes.

const results = [];
function test(name, fn) {
  try { fn(); results.push({ name, ok: true }); }
  catch (e) { results.push({ name, ok: false, err: String(e && e.message || e) }); }
}
async function atest(name, fn) {
  try { await fn(); results.push({ name, ok: true }); }
  catch (e) { results.push({ name, ok: false, err: String(e && e.message || e) }); }
}
function ok(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }
function eq(a, b, msg) {
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    throw new Error(`${msg || 'eq failed'}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`);
  }
}

async function run() {
  let mods;
  try {
    mods = {
      rng: await import('../js/engine/rng.js'),
      engineStorage: await import('../js/engine/storage.js'),
      mastery: await import('../js/engine/mastery.js'),
      scheduler: await import('../js/engine/scheduler.js'),
      check: await import('../js/engine/check.js'),
      progress: await import('../js/engine/progress.js'),
      content: await import('../js/maths/content/index.js'),
      lessons: await import('../js/maths/content/lessons.js'),
      school: await import('../js/maths/school.js'),
      gen: await import('../js/maths/content/gen.js'),
      glossary: await import('../js/maths/content/glossary.js'),
      shellStorage: await import('../js/shell/storage.js'),
      lesson: await import('../js/ui/lesson.js'),
      gloss: await import('../js/ui/gloss.js'),
      focus: await import('../js/ui/focus.js'),
      tutor: await import('../js/qa/tutor.js'),
      mapScene: await import('../js/ui/map-scene.js'),
      endpoint: await import('../js/qa/endpoint.js'),
      rhythm: await import('../js/shell/rhythm.js'),
      build: await import('../js/shell/build.js'),
      session: await import('../js/ui/session.js'),
      y5bridge: await import('../js/maths/y5-bridge.js'),
      vis: await import('../js/maths/content/vis.js'),
      y5: await import('../js/maths/content/y5.js'),
      // English (Wordforge port)
      enVocab: await import('../js/english/engine/vocab.js'),
      enLevel: await import('../js/english/engine/level.js'),
      enStory: await import('../js/english/engine/story.js'),
      enIndex: await import('../js/english/content/story-index.js'),
      enClaude: await import('../js/english/qa/claude.js'),
      enGenie: await import('../js/english/qa/genie.js'),
      enTalk: await import('../js/english/qa/talk.js'),
      enScenes: await import('../js/english/ui/world-scenes.js'),
      enRead: await import('../js/english/ui/read.js'),
      enStt: await import('../js/english/ui/stt.js'),
    };
  } catch (e) {
    results.push({ name: 'MODULE IMPORTS', ok: false, err: String(e) });
    report();
    return;
  }

  const { makeRng, seedFromString, ri, shuffle } = mods.rng;
  const { addDays, daysBetween } = mods.engineStorage;
  const { newMastery, updateMastery, bandOf, scheduleAfterSession, diagnosticScore } = mods.mastery;
  const { planSession, nextNewTopic, dueReviewTopics, pickReviewTopics, NEW_TOPIC_TIERS, pacing, SESSION_ITEMS } = mods.scheduler;
  const { checkAnswer, parseNumber, answerText, gcd } = mods.check;
  const { finishSession } = mods.progress;
  const { topics, topicOrder, topicById, journeyMeta, y5Topics, completedY6, isY6Topic } = mods.content;
  // Every generator in the app: the Year 6 journey plus the Year 5 review pool.
  const allTopics = [...topics, ...y5Topics];
  const shellStorage = mods.shellStorage;

  let swText = '';
  try {
    swText = await (await fetch('../sw.js')).text();
  } catch (e) {
    results.push({ name: 'SW FETCH', ok: false, err: String(e) });
  }

  // ==================== A. ENGINE (ported from powermath-trainer) ====================

  // ---------------- rng
  test('rng: deterministic for equal seeds', () => {
    const a = makeRng(42), b = makeRng(42);
    for (let i = 0; i < 100; i++) eq(a(), b());
  });
  test('rng: ri stays in bounds', () => {
    const r = makeRng(7);
    for (let i = 0; i < 500; i++) {
      const v = ri(r, 3, 9);
      ok(v >= 3 && v <= 9 && Number.isInteger(v), 'ri out of bounds: ' + v);
    }
  });
  test('rng: shuffle is a permutation', () => {
    const r = makeRng(9);
    const arr = [1, 2, 3, 4, 5];
    const s = shuffle(r, arr);
    eq(s.slice().sort(), arr, 'not a permutation');
    eq(arr, [1, 2, 3, 4, 5], 'input mutated');
  });

  // ---------------- dates
  test('dates: addDays crosses month ends', () => {
    eq(addDays('2026-07-31', 1), '2026-08-01');
    eq(addDays('2026-12-31', 1), '2027-01-01');
    eq(daysBetween('2026-07-20', '2026-07-27'), 7);
  });

  // ---------------- mastery
  test('mastery: EWMA stays within [5,100]', () => {
    const m = newMastery(50);
    for (let i = 0; i < 60; i++) updateMastery(m, 1, false);
    ok(m.score >= 5, 'floor broken: ' + m.score);
    for (let i = 0; i < 60; i++) updateMastery(m, 3, true);
    ok(m.score <= 100, 'ceiling broken: ' + m.score);
    ok(m.score > 80, 'many correct answers should lift the score, got ' + m.score);
  });
  test('mastery: misses hurt more on easy tiers', () => {
    const a = newMastery(70), b = newMastery(70);
    updateMastery(a, 1, false);
    updateMastery(b, 3, false);
    ok(a.score < b.score, `tier-1 miss (${a.score}) should drop below tier-3 miss (${b.score})`);
  });
  test('mastery: bands and review gaps', () => {
    eq(bandOf(40), 'struggling'); eq(bandOf(70), 'developing'); eq(bandOf(90), 'secure');
    const m = newMastery(40);
    scheduleAfterSession(m, '2026-07-20');
    eq(m.due, '2026-07-21', 'struggling reviews next day');
    const m2 = newMastery(95);
    scheduleAfterSession(m2, '2026-07-20');
    eq(m2.due, '2026-07-27', 'secure reviews after a week');
    ok(diagnosticScore(0) < diagnosticScore(1), 'diagnostic score monotone');
  });
  test('mastery: assisted help halves the correct move, never exceeds normal', () => {
    eq(updateMastery(newMastery(60), 2, true).score, 67);              // normal: 60 + 0.17·40
    eq(updateMastery(newMastery(60), 2, true, { assisted: true }).score, 63); // assisted: 60 + 0.085·40
    ok(63 > 60, 'assisted never punishes');
    ok(63 < 67, 'assisted never lifts as much as independent');
  });
  test('mastery: assisted flag is a no-op on a wrong answer', () => {
    eq(updateMastery(newMastery(60), 2, false).score,
       updateMastery(newMastery(60), 2, false, { assisted: true }).score);
  });
  test('mastery: EWMA stays in [5,100] under assisted correct', () => {
    const m = newMastery(50);
    let prev = m.score;
    for (let i = 0; i < 60; i++) { updateMastery(m, 1, true, { assisted: true }); ok(m.score >= prev, 'non-decreasing'); prev = m.score; }
    ok(m.score <= 100, 'ceiling holds');
  });

  // ---------------- check
  test('check: parseNumber handles commas, spaces, minus', () => {
    eq(parseNumber('34,500'), 34500);
    eq(parseNumber('34 500'), 34500);
    eq(parseNumber('-4'), -4);
    eq(parseNumber('−4'), -4);
    eq(parseNumber('2.75'), 2.75);
    eq(parseNumber('abc'), null);
    eq(parseNumber(''), null);
  });
  test('check: fraction equivalence and exactness', () => {
    ok(checkAnswer({ kind: 'frac', answer: { n: 1, d: 2 } }, { n: '2', d: '4' }).ok, '2/4 should equal 1/2');
    ok(!checkAnswer({ kind: 'frac', answer: { n: 1, d: 2 }, exact: true }, { n: '2', d: '4' }).ok, 'exact mode rejects 2/4');
    ok(checkAnswer({ kind: 'frac', answer: { n: 5, d: 4 } }, { n: '5', d: '4' }).ok, 'improper accepted');
    ok(!checkAnswer({ kind: 'frac', answer: { n: 1, d: 2 } }, { n: '1', d: '0' }).ok, 'zero denominator rejected');
  });
  test('check: order + mc + tf + tolerance', () => {
    ok(checkAnswer({ kind: 'order', correctOrder: ['1', '2', '3'] }, ['1', '2', '3']).ok);
    ok(!checkAnswer({ kind: 'order', correctOrder: ['1', '2', '3'] }, ['2', '1', '3']).ok);
    ok(checkAnswer({ kind: 'mc', answerIndex: 2 }, 2).ok);
    ok(checkAnswer({ kind: 'tf', answer: false }, false).ok);
    ok(checkAnswer({ kind: 'num', answer: 5.9, tolerance: 0.001 }, '5.9').ok);
    ok(checkAnswer({ kind: 'num', answer: 0.3, tolerance: 0.001 }, '0.3').ok);
    eq(gcd(12, 18), 6);
  });

  // ==================== B. SCHEDULER SMOKE (fresh, small) ====================

  test('scheduler: diagnostic comes first', () => {
    const state = shellStorage.defaultState();
    const plan = planSession(state.maths.y6, topicOrder, '2026-07-20', makeRng(1), journeyMeta);
    eq(plan.kind, 'diagnostic');
  });

  test('scheduler: a fresh, diagnosed state offers the one Y6 topic as new', () => {
    const state = shellStorage.defaultState();
    state.maths.y6.diagnosticDone = true;
    const plan = planSession(state.maths.y6, topicOrder, '2026-07-20', makeRng(1), journeyMeta);
    eq(plan.kind, 'daily');
    eq(plan.newTopic, 'u01-pv10m');
  });

  test('scheduler: an overdue topic joins the daily plan as review', () => {
    const state = shellStorage.defaultState();
    const slice = state.maths.y6;
    slice.diagnosticDone = true;
    slice.completed.push('u01-pv10m');
    slice.mastery['u01-pv10m'] = newMastery(50);
    slice.mastery['u01-pv10m'].due = '2026-01-01';
    const plan = planSession(slice, topicOrder, '2026-06-01', makeRng(2), journeyMeta);
    eq(plan.kind, 'daily', 'with topics still unlearned the day stays a daily');
    ok(plan.newTopic && plan.newTopic !== 'u01-pv10m', 'a new topic is offered');
    ok(plan.review.length > 0 && plan.review.every((r) => r.topicId === 'u01-pv10m'),
      'the overdue topic fills the review block');
    ok(plan.review.every((r) => [1, 2, 3].includes(r.tier)), 'every review entry carries a valid tier');
  });

  test('scheduler: with the whole book learned, an overdue topic makes a review day', () => {
    const state = shellStorage.defaultState();
    const slice = state.maths.y6;
    slice.diagnosticDone = true;
    for (const id of topicOrder) {
      slice.completed.push(id);
      slice.mastery[id] = newMastery(80);
    }
    slice.mastery['u02-divide'].due = '2026-01-01';
    const plan = planSession(slice, topicOrder, '2026-06-01', makeRng(2), journeyMeta);
    eq(plan.kind, 'review');
    ok(plan.review.length > 0 && plan.review.every((r) => r.topicId === 'u02-divide'),
      'the one due topic fills the review-only day');
  });

  test('scheduler: a review-only day spreads eleven items over up to five topics, a daily over three', () => {
    const { MAX_REVIEW_TOPICS, MAX_REVIEW_TOPICS_ONLY, REVIEW_ITEMS_DAILY } = mods.scheduler;
    eq(MAX_REVIEW_TOPICS, 3);
    eq(MAX_REVIEW_TOPICS_ONLY, 5);
    // Whole book learned, everything overdue: a review day with a big pool.
    const state = shellStorage.defaultState();
    const slice = state.maths.y6;
    slice.diagnosticDone = true;
    for (const id of topicOrder) {
      slice.completed.push(id);
      slice.mastery[id] = newMastery(70);
      slice.mastery[id].due = '2026-01-01';
    }
    const plan = planSession(slice, topicOrder, '2026-06-01', makeRng(3), journeyMeta);
    eq(plan.kind, 'review');
    eq(plan.review.length, SESSION_ITEMS, 'still one sitting of eleven');
    const distinct = new Set(plan.review.map((r) => r.topicId));
    eq(distinct.size, MAX_REVIEW_TOPICS_ONLY, 'five different topics, not three');
    const per = {};
    for (const r of plan.review) per[r.topicId] = (per[r.topicId] ?? 0) + 1;
    ok(Math.max(...Object.values(per)) <= 3, 'no topic gets more than three of the eleven (3/2/2/2/2)');

    // Behind a new topic the review block keeps its old shape: 4 items, ≤ 3 topics.
    const daily = shellStorage.defaultState().maths.y6;
    daily.diagnosticDone = true;
    for (const id of topicOrder.slice(0, 8)) {
      daily.completed.push(id);
      daily.mastery[id] = newMastery(70);
      daily.mastery[id].due = '2026-01-01';
    }
    const dplan = planSession(daily, topicOrder, '2026-06-01', makeRng(3), journeyMeta);
    eq(dplan.kind, 'daily');
    eq(dplan.review.length, REVIEW_ITEMS_DAILY);
    ok(new Set(dplan.review.map((r) => r.topicId)).size <= MAX_REVIEW_TOPICS, 'a daily reviews at most three topics');
  });

  // ==================== C. GENERATOR SWEEP (fresh) ====================

  // Correct-input builder per question kind: the checker must accept its own answer.
  function correctInput(q) {
    switch (q.kind) {
      case 'num': return String(q.answer);
      case 'mc': return q.answerIndex;
      case 'tf': return q.answer;
      case 'frac': return { n: String(q.answer.n), d: String(q.answer.d) };
      case 'order': return q.correctOrder.slice();
      default: return null;
    }
  }

  test('generators: every topic sweeps clean across tiers and seeds', () => {
    for (const t of allTopics) {
      for (let tier = 1; tier <= 3; tier++) {
        for (let seed = 0; seed < 40; seed++) {
          const rng = makeRng(seedFromString(`${t.id}|${tier}|${seed}`));
          const q = t.gen(rng, tier);
          const where = `${t.id} t${tier} s${seed}`;
          ok(q && typeof q === 'object', where + ': no question');
          ok(['num', 'mc', 'tf', 'frac', 'order'].includes(q.kind), where + ': bad kind ' + q.kind);
          ok(typeof q.prompt === 'string' && q.prompt.length > 4, where + ': empty prompt');
          if (q.kind === 'num' || q.kind === 'mc') {
            eq(q.tier, tier, where + ': tier mismatch');
          }
          const res = checkAnswer(q, correctInput(q));
          ok(res.ok, where + ': checker rejects its own correct answer');
        }
      }
    }
  });

  test('generators: same seed twice gives the same prompt (tiers 1-2)', () => {
    // Tier 3 is deliberately excluded: scenario() deals story builders from a
    // shared per-key deck WITHOUT replacement, so a second call — even with an
    // identical rng — continues the rotation. That statefulness is the whole
    // point (no repeated story until the pool is exhausted).
    for (const t of allTopics) {
      for (let tier = 1; tier <= 2; tier++) {
        const seed = seedFromString(`${t.id}|${tier}|determinism`);
        const a = t.gen(makeRng(seed), tier);
        const b = t.gen(makeRng(seed), tier);
        eq(a.prompt, b.prompt, `${t.id} t${tier}: same seed produced different prompts`);
      }
    }
  });

  test('generators: tier-3 stories rotate (no immediate repeat)', () => {
    // The flip side of the exclusion above: consecutive tier-3 draws of the
    // same topic must not tell the same story twice in a row.
    //
    // Year 6 topics only: every Year 6 tier 3 is a scenario() pool, which is
    // what this pins. Most Year 5 tier 3s are procedural templates ("What is
    // 10,000 more than N?") with no deck behind them, so two identical shells
    // in a row are a coin flip there, not a regression. They shipped that way
    // for a whole summer; the sweep and determinism checks above cover them.
    for (const t of topics) {
      const rng = makeRng(seedFromString(t.id + '|rotate'));
      let prev = null;
      for (let i = 0; i < 6; i++) {
        const q = t.gen(rng, 3);
        const shell = String(q.prompt).replace(/[\d,.:−-]+/g, '#');
        ok(shell !== prev, `${t.id}: the same tier-3 story twice in a row`);
        prev = shell;
      }
    }
  });

  // ==================== C2. LESSON REGISTER + TOMORROW'S WARM-UPS (B8) ====================

  const L = mods.lessons;

  test('lessons: 140 lessons, per-unit counts as in the Pearson overview, unique ids', () => {
    eq(L.LESSONS.length, 140, 'the overview lists 140 lessons');
    const perUnit = L.UNITS.map((u) => L.lessonsOfUnit(u.unit).length);
    eq(perUnit, [7, 10, 9, 11, 9, 4, 9, 9, 11, 5, 11, 9, 12, 14, 10], 'lessons per unit');
    eq(new Set(L.LESSONS.map((l) => l.id)).size, 140, 'ids are unique');
    eq(L.LESSONS.filter((l) => l.book === '6A').length, 50);
    eq(L.LESSONS.filter((l) => l.book === '6B').length, 54);
    eq(L.LESSONS.filter((l) => l.book === '6C').length, 36);
    eq(L.lessonById('u04-l07').title, 'Adding and subtracting fractions (2)');
    eq(L.lessonLabel('u04-l07'), 'U4 · L7');
  });

  test('lessons: 6A and Units 7-8 map to Y6 topics, in topic order; units 9-15 wait for content', () => {
    // Content reaches as far as the class needs it next (B9: Unit 7 Decimals; B10:
    // Unit 8 Percentages). Moving this line is a deliberate act when the next unit lands.
    const covered = (l) => l.book === '6A' || l.unit === 7 || l.unit === 8;
    for (const l of L.LESSONS.filter(covered)) {
      ok(l.topicId && isY6Topic(l.topicId), `${l.id}: no Y6 topic`);
    }
    // Walking the lessons in book order visits each topic in one run, in topicOrder.
    const runs = [];
    for (const l of L.LESSONS) if (l.topicId && runs[runs.length - 1] !== l.topicId) runs.push(l.topicId);
    eq(runs, topicOrder, 'lesson ranges follow the topic spine');
    eq(L.LESSONS.filter((l) => l.unit === 7).map((l) => l.topicId),
      ['u07-dec-place', 'u07-dec-place', 'u07-dec-place', 'u07-dec-place', 'u07-dec-place',
        'u07-dec-ops', 'u07-dec-ops', 'u07-dec-ops', 'u07-dec-ops'], 'Unit 7: L1-5 place value and fractions, L6-9 operations');
    eq(L.LESSONS.filter((l) => l.unit === 8).map((l) => l.topicId),
      ['u08-pct-of', 'u08-pct-of', 'u08-pct-of', 'u08-pct-of', 'u08-pct-of',
        'u08-pct-equiv', 'u08-pct-equiv', 'u08-pct-equiv', 'u08-pct-equiv'], 'Unit 8: L1-5 percentage of, L6-9 equivalence and problems');
    eq(L.LESSONS.filter((l) => !covered(l) && l.topicId).length, 0, 'no topic beyond Unit 8 yet');
    eq(L.previewOf('u09-l01'), null, 'no preview without content');
  });

  test('lessons: navigation — next, first, last, and topics taught by a lesson', () => {
    eq(L.nextLesson(null).id, 'u01-l01');
    eq(L.nextLesson('u04-l11').id, 'u05-l01', 'a unit hands over to the next one');
    eq(L.nextLesson('u15-l10'), null);
    eq(L.nextLesson('nope'), null);
    eq(L.topicsTaughtBy('u04-l05'),
      ['u01-pv10m', 'u01-round-neg', 'u02-addsub', 'u02-multiply', 'u02-divide',
        'u03-factors', 'u03-order-ops', 'u04-simplify', 'u04-compare']);
    eq(L.topicsTaughtBy('u04-l04').includes('u04-compare'), false, 'a topic is taught only at its LAST lesson');
  });

  test('lessons: units 4-8 have lesson-precise warm-ups; the rest fall back to the topic', () => {
    for (const l of L.LESSONS.filter((x) => x.unit >= 4 && x.unit <= 8)) {
      const p = L.previewOf(l.id);
      ok(p && p.own, `${l.id}: no lesson-precise preview`);
      ok(p.segments.length === 1 && typeof p.segments[0].text === 'string' && p.segments[0].text.length > 20,
        `${l.id}: intro missing`);
      ok(typeof p.segments[0].alt === 'string' && p.segments[0].alt.length > 20, `${l.id}: no "say it differently"`);
      ok(p.example && Array.isArray(p.example.steps) && p.example.steps.length >= 2, `${l.id}: no worked example`);
    }
    const fb = L.previewOf('u02-l06');
    ok(fb && !fb.own && fb.segments.length >= 1, 'a U2 lesson falls back to its topic');
    eq(Object.keys(L.LESSON_PREVIEWS).filter((id) => !L.lessonById(id)), [], 'every preview key is a real lesson');
  });

  test('lessons: every warm-up sweeps clean (tiers 1-2 x 40 seeds) and is deterministic', () => {
    for (const l of L.LESSONS) {
      const p = L.previewOf(l.id);
      if (!p) continue;
      for (let tier = 1; tier <= 2; tier++) {
        for (let seed = 0; seed < 40; seed++) {
          const where = `${l.id} t${tier} s${seed}`;
          const q = p.gen(makeRng(seedFromString(`${l.id}|${tier}|${seed}`)), tier);
          ok(q && typeof q === 'object', where + ': no question');
          ok(['num', 'mc', 'tf', 'frac', 'order'].includes(q.kind), where + ': bad kind ' + q.kind);
          ok(typeof q.prompt === 'string' && q.prompt.length > 4, where + ': empty prompt');
          // Lesson-precise warm-ups pin the tier on every kind; the topic
          // fallbacks inherit the topic sweep's rule (num/mc only).
          if (p.own || q.kind === 'num' || q.kind === 'mc') eq(q.tier, tier, where + ': tier mismatch');
          ok(checkAnswer(q, correctInput(q)).ok, where + ': checker rejects its own correct answer');
          if (q.kind === 'mc') {
            const opts = q.options.map(String);
            eq(new Set(opts).size, opts.length, where + ': duplicate options');
            ok(opts.length >= 2, where + ': fewer than two options');
          }
          if (q.kind === 'num') ok(Number.isFinite(q.answer), where + ': answer is not a number');
          if (q.kind === 'frac') ok(q.answer.d > 0 && Number.isInteger(q.answer.n) && Number.isInteger(q.answer.d), where + ': bad fraction');
        }
        const seed = seedFromString(`${l.id}|${tier}|determinism`);
        eq(p.gen(makeRng(seed), tier).prompt, p.gen(makeRng(seed), tier).prompt, `${l.id} t${tier}: not deterministic`);
      }
    }
  });

  // ==================== C2b. FOUR-QUADRANT GRID + UNIT 7 DECIMALS (B9) ====================

  const minusStr = (v) => (v < 0 ? `−${-v}` : String(v));
  const ptStr = (x, y) => `(${minusStr(x)}, ${minusStr(y)})`;
  const plainText = (s) => String(s).replace(/<[^>]*>/g, '');
  const Q4 = 'data-grid="q4"';
  const U6_GRID_LESSONS = ['u06-l02', 'u06-l03', 'u06-l04'];

  test('four-quadrant grid: tick labels, dots and point labels never collide, all inside the picture', () => {
    // coordGrid4 (vis.js) for U6 L2-L4. Every grid the warm-ups and the U6 topic
    // text build is rendered here and measured with getBBox — the standard of
    // the number-line test: estimated widths are how unreadable pictures ship.
    const grids = [];
    for (const id of U6_GRID_LESSONS) {
      const p = L.previewOf(id);
      if (p.segments[0].svg?.includes(Q4)) grids.push([`${id} intro`, p.segments[0].svg]);
      for (let tier = 1; tier <= 2; tier++) {
        let n = 0;
        for (let seed = 0; seed < 40; seed++) {
          const q = p.gen(makeRng(seedFromString(`${id}|${tier}|${seed}`)), tier);
          if (q.svg?.includes(Q4)) { grids.push([`${id} t${tier} s${seed}`, q.svg]); n += 1; }
        }
        // L2's class task IS the grid; L3/L4 use it where coordinates go negative (tier 2).
        if (id === 'u06-l02' || tier === 2) ok(n >= 8, `${id} t${tier}: only ${n} of 40 questions draw the four-quadrant grid`);
      }
    }
    ok(L.previewOf('u06-l02').segments[0].svg?.includes(Q4), 'the L2 intro shows the four quadrants');
    for (const seg of topicById('u06-position').explanation.segments) {
      if (seg.svg?.includes(Q4)) grids.push(['u06-position text', seg.svg]);
    }
    const host = document.createElement('div');
    host.style.width = '520px';
    document.body.append(host);
    const box = (el) => { const b = el.getBBox(); return { x0: b.x, y0: b.y, x1: b.x + b.width, y1: b.y + b.height }; };
    // A text's width is its getBBox width; its HEIGHT is not its getBBox height,
    // which is the font's whole line box (1.33 em in Segoe UI) — two "−1"s near
    // the origin "overlapped" by that measure with three units of white between
    // the glyphs. Digits, minus signs and capitals have no descenders: the ink
    // runs from about 0.75 em above the baseline down to the baseline.
    const inkBox = (t) => {
      const b = t.getBBox(), base = Number(t.getAttribute('y')), fs = Number(t.getAttribute('font-size'));
      return { x0: b.x, x1: b.x + b.width, y0: base - 0.75 * fs, y1: base + 0.05 * fs };
    };
    const hit = (a, b) => a.x0 < b.x1 - 0.5 && b.x0 < a.x1 - 0.5 && a.y0 < b.y1 - 0.5 && b.y0 < a.y1 - 0.5;
    // Measured in the app's own font stack (app.css) AND in this page's
    // monospace, whose digits run wider: a pass in both leaves room for the
    // iPad's SF Pro, which this machine does not have.
    const FONTS = ['-apple-system, "SF Pro Rounded", "Segoe UI", system-ui, sans-serif', 'ui-monospace, monospace'];
    try {
      for (const [where0, svg] of grids) for (const font of FONTS) {
        const where = `${where0} [${font.split(',')[0]}]`;
        host.style.fontFamily = font;
        host.innerHTML = svg;
        const [, , W, H] = host.querySelector('svg').getAttribute('viewBox').split(' ').map(Number);
        const parts = [...host.querySelectorAll('text.tick')].map((t) => ({ s: `tick "${t.textContent}"`, b: inkBox(t) }));
        for (const g of host.querySelectorAll('g.pt')) {
          parts.push({ s: `dot ${g.dataset.label}`, b: box(g.querySelector('circle')) });
          parts.push({ s: `label ${g.dataset.label}`, b: inkBox(g.querySelector('text')) });
        }
        ok(parts.length > 20, `${where}: no tick labels measured`);
        for (let i = 0; i < parts.length; i++) {
          const a = parts[i];
          ok(a.b.x0 >= 0 && a.b.y0 >= 0 && a.b.x1 <= W && a.b.y1 <= H, `${where}: ${a.s} sticks out of the picture`);
          for (let j = i + 1; j < parts.length; j++) {
            ok(!hit(a.b, parts[j].b), `${where}: ${a.s} and ${parts[j].s} overlap`);
          }
        }
      }
    } finally {
      host.remove();
    }
  });

  test('four-quadrant grid: the point a question names is drawn where its answer says; an answer is never drawn', () => {
    const host = document.createElement('div');
    document.body.append(host);
    let named = 0, hidden = 0;
    try {
      for (const id of U6_GRID_LESSONS) {
        const p = L.previewOf(id);
        for (let tier = 1; tier <= 2; tier++) {
          for (let seed = 0; seed < 40; seed++) {
            const where = `${id} t${tier} s${seed}`;
            const q = p.gen(makeRng(seedFromString(`${id}|${tier}|${seed}`)), tier);
            if (!q.svg?.includes(Q4)) continue;
            host.innerHTML = q.svg;
            const drawn = new Map([...host.querySelectorAll('g.pt')]
              .map((g) => [g.dataset.label, ptStr(Number(g.dataset.x), Number(g.dataset.y))]));
            const prompt = plainText(q.prompt);
            const answer = q.kind === 'mc' ? plainText(q.options[q.answerIndex]) : null;
            let m;
            if ((m = /coordinates of point ([A-Z])\?/.exec(prompt))) {
              eq(drawn.get(m[1]), answer, `${where}: point ${m[1]} is drawn somewhere else than the answer`);
              named += 1;
            } else if ((m = /^Which point is at (\(.+?\))\?/.exec(prompt))) {
              eq(drawn.get(answer), m[1], `${where}: the right letter is not drawn at ${m[1]}`);
              named += 1;
            } else if ((m = /^What is the ([xy])-coordinate of point ([A-Z])\?/.exec(prompt))) {
              const g = host.querySelector(`g.pt[data-label="${m[2]}"]`);
              eq(Number(g.dataset[m[1]]), q.answer, `${where}: the drawn ${m[1]}-coordinate is not the answer`);
              named += 1;
            }
            if (/new coordinates|coordinates of D\?/.test(prompt)) {
              ok(![...drawn.values()].includes(answer), `${where}: the answer ${answer} is drawn on the grid`);
              hidden += 1;
            }
          }
        }
      }
    } finally {
      host.remove();
    }
    ok(named >= 30, `only ${named} grid-reading questions checked`);
    ok(hidden >= 20, `only ${hidden} "work it out" questions checked`);
  });

  // Every Year 6 question and warm-up, for the sweeps below: [where, question].
  function* y6Questions() {
    for (const t of topics) {
      for (let tier = 1; tier <= 3; tier++) {
        for (let seed = 0; seed < 40; seed++) {
          yield [`${t.id} t${tier} s${seed}`, t.gen(makeRng(seedFromString(`${t.id}|${tier}|noise|${seed}`)), tier), t.unit];
        }
      }
    }
    for (const l of L.LESSONS) {
      const p = L.previewOf(l.id);
      if (!p?.own) continue;
      for (let tier = 1; tier <= 2; tier++) {
        for (let seed = 0; seed < 40; seed++) {
          yield [`${l.id} t${tier} s${seed}`, p.gen(makeRng(seedFromString(`${l.id}|${tier}|${seed}`)), tier), l.unit];
        }
      }
    }
  }
  const placesOfAnswer = (v) => (String(v).split('.')[1] ?? '').length;

  test('decimals: no float noise anywhere a child reads; number answers have at most 3 decimal places', () => {
    // 0.1 × 3 is 0.30000000000000004 in JavaScript. Unit 7 builds every decimal
    // as an integer over a power of ten (y6b.js); this sweeps every Year 6
    // generator and warm-up and their texts, so a float slip anywhere shows up.
    const noise = /\d\.\d*(0000|9999)\d/;
    const clean = (where, s) => ok(!noise.test(String(s)), `${where}: float noise in "${plainText(s).slice(0, 90)}"`);
    for (const [where, q] of y6Questions()) {
      for (const s of [q.prompt, q.hint, q.explain, ...(q.options ?? []), ...(q.items ?? [])]) clean(where, s ?? '');
      if (q.kind === 'num') ok(placesOfAnswer(q.answer) <= 3, `${where}: answer ${q.answer} has more than 3 decimal places`);
    }
    for (const t of topics) {
      for (const seg of t.explanation.segments) { clean(t.id, seg.text); clean(t.id, seg.alt); }
      for (const s of t.example.steps) clean(t.id, s);
    }
    for (const id of Object.keys(L.LESSON_PREVIEWS)) {
      const p = L.previewOf(id);
      clean(id, p.segments[0].text); clean(id, p.segments[0].alt);
      for (const s of p.example.steps) clean(id, s);
    }
  });

  test('decimals: a money answer is shown as £x.xx in the feedback', () => {
    // The engine's answerText (verbatim from Y5) prints "2.7 pounds"; Unit 7
    // teaches that this is written £2.70.
    const { answerHtml } = mods.session;
    eq(answerHtml({ kind: 'num', answer: 2.7, unit: 'pounds' }), '£2.70');
    eq(answerHtml({ kind: 'num', answer: 16, unit: 'pounds' }), '£16.00');
    eq(answerHtml({ kind: 'num', answer: 35, unit: '%' }), '35%', 'a percentage reads 35%, not "35 %"');
    eq(answerHtml({ kind: 'num', answer: 2.7, unit: 'm' }), '2.7 m', 'other units keep the engine text');
  });

  test('decimals: every Unit 7-8 number question offers the decimal point on the pad', () => {
    // session.js hides "." whenever the answer is a whole number — in Units 7
    // and 8, where answers are whole or not, that gives the answer away. dnum()
    // (y6b.js) sets allowDecimal on every one of them.
    let whole = 0, frac = 0;
    for (const [where, q, unit] of y6Questions()) {
      if ((unit !== 7 && unit !== 8) || q.kind !== 'num') continue;
      ok(q.allowDecimal === true, `${where}: the pad would hide the decimal point`);
      if (unit !== 7) continue;
      if (Number.isInteger(q.answer)) whole += 1; else frac += 1;
    }
    ok(whole > 20 && frac > 20, `Unit 7 should mix whole and decimal answers (whole ${whole}, decimal ${frac})`);
  });

  // ==================== C3. CLASS TRACKER (maths/school.js, B8) ====================

  const S = mods.school;
  // isResumable compares against the real calendar day, so session tests use it.
  const dayKeyToday = () => mods.engineStorage.dayKey();
  // A Y6 slice as on the device: warm-up done, priors present for every topic.
  function trackerSlice() {
    const st = shellStorage.defaultState();
    const slice = st.maths.y6;
    slice.diagnosticDone = true;
    for (const t of topics) slice.mastery[t.id] = newMastery(60);
    return slice;
  }

  test('tracker: calendar — weekdays, weekends, the last school day', () => {
    eq(S.weekday('2026-11-10'), 2, 'a Tuesday');
    eq(S.isSchoolDay('2026-11-13'), true, 'Friday');
    eq(S.isSchoolDay('2026-11-14'), false, 'Saturday');
    eq(S.lastSchoolDay('2026-11-15'), '2026-11-13', 'Sunday looks back to Friday');
    eq(S.lastSchoolDay('2026-11-16'), '2026-11-16', 'Monday is its own');
  });

  test('tracker: a check-in is owed once per school day, and a weekend asks only about a missed Friday', () => {
    const slice = trackerSlice();
    eq(S.checkinDue(slice, '2026-11-10'), true, 'never checked in');
    slice.school.lastCheckin = '2026-11-10';
    eq(S.checkinDue(slice, '2026-11-10'), false, 'done today');
    eq(S.checkinDue(slice, '2026-11-11'), true, 'a new school day');
    slice.school.lastCheckin = '2026-11-13';
    eq(S.checkinDue(slice, '2026-11-14'), false, 'Saturday after a Friday check-in');
    eq(S.checkinDue(slice, '2026-11-15'), false, 'Sunday too');
    slice.school.lastCheckin = '2026-11-12';
    eq(S.checkinDue(slice, '2026-11-14'), true, 'Friday was missed');
  });

  test('tracker: check-ins move the position, teach finished topics, and a same-day correction undoes the first', () => {
    const slice = trackerSlice();
    eq(S.predictedLesson(slice), null, 'no prediction before the first check-in');
    const r = S.applyCheckin(slice, '2026-11-10', { lesson: 'u04-l05', finished: true });
    eq(r.pos, 'u04-l05');
    eq(S.predictedLesson(slice).id, 'u04-l06');
    ok(r.taught.includes('u04-compare') && r.taught.includes('u01-pv10m'), 'every topic up to U4 L5 is taught');
    ok(!slice.completed.includes('u04-addsub-frac'), 'the topic in progress is not');
    ok(slice.mastery['u04-compare'].due > '2026-11-10', 'a taught topic is scheduled for review');
    eq(Object.keys(slice.stars).length, 0, 'teaching earns no stars');

    // Same day again = a correction: one log entry, the position from before it is the base.
    S.applyCheckin(slice, '2026-11-10', { lesson: 'u04-l06', finished: false });
    eq(slice.school.log.length, 1, 'one entry per day');
    eq(slice.school.pos, 'u04-l06');
    S.applyCheckin(slice, '2026-11-10', { lesson: null });
    eq(slice.school.pos, null, 'correcting to "no new lesson" restores the position from before the day');
    S.applyCheckin(slice, '2026-11-10', { lesson: 'u04-l06', finished: false });

    S.applyCheckin(slice, '2026-11-11', { lesson: null });
    eq(slice.school.pos, 'u04-l06', '"no new lesson" keeps the position');
    eq(slice.school.log.at(-1), { day: '2026-11-11', lesson: null, finished: null, before: 'u04-l06' });

    S.applyCheckin(slice, '2026-11-12', { lesson: 'u05-l02', finished: true });
    ok(slice.completed.includes('u04-addsub-frac'), 'a jump ahead teaches what it passed');
    S.applyCheckin(slice, '2026-11-13', { lesson: 'u05-l01', finished: true });
    eq(slice.school.pos, 'u05-l01', 'stepping back is allowed');
    ok(slice.completed.includes('u04-addsub-frac'), 'and does not un-teach');

    let threw = false;
    try { S.applyCheckin(slice, '2026-11-16', { lesson: 'u99-l01' }); } catch { threw = true; }
    ok(threw, 'an unknown lesson is refused');
  });

  test('tracker: the round is 4 of tomorrow + 2 review, with 2 of today first when unfinished', () => {
    const slice = trackerSlice();
    S.applyCheckin(slice, '2026-11-10', { lesson: 'u04-l06', finished: true });
    let p = S.planPreview(slice, '2026-11-10', makeRng(1));
    eq(p.target, 'u04-l07');
    eq(p.hasPreview, true);
    eq(p.catchUp, null);
    eq(p.introAt, 0);
    eq(p.items.map((i) => i.part), ['preview', 'preview', 'preview', 'preview', 'review', 'review']);
    eq(p.items.filter((i) => i.part === 'preview').map((i) => i.tier), S.PREVIEW_TIERS);
    const rev = p.items.filter((i) => i.part === 'review').map((i) => i.topicId);
    eq(new Set(rev).size, 2, 'two different review topics');
    ok(!rev.includes('u04-addsub-frac'), 'review never repeats the topic being previewed');

    S.applyCheckin(slice, '2026-11-10', { lesson: 'u04-l06', finished: false });
    p = S.planPreview(slice, '2026-11-10', makeRng(1));
    eq(p.catchUp, 'u04-l06');
    eq(p.introAt, 2, 'the intro comes after the catch-up');
    eq(p.items.length, 8);
    eq(p.items.slice(0, 2).map((i) => [i.part, i.lessonId, i.tier]), [['catchup', 'u04-l06', 1], ['catchup', 'u04-l06', 2]]);

    S.applyCheckin(slice, '2026-11-11', { lesson: null });
    eq(S.planPreview(slice, '2026-11-11', makeRng(1)).catchUp, null, 'the catch-up belongs to the check-in that reported it');
  });

  test('tracker: a next lesson without content is a review round; the end of the book has no target', () => {
    const slice = trackerSlice();
    // The first lesson without content: Unit 9 since B10 (Unit 8 in B9, Unit 7 before).
    S.applyCheckin(slice, '2026-11-10', { lesson: 'u08-l09', finished: false });
    const p = S.planPreview(slice, '2026-11-10', makeRng(2));
    eq(p.target, 'u09-l01');
    eq(p.hasPreview, false);
    eq(p.introAt, null);
    eq(p.items.filter((i) => i.part === 'catchup').length, 2, 'today\'s unfinished pages still come first');
    eq(p.items.filter((i) => i.part === 'review').length, S.REVIEW_DAY_ITEMS);
    S.applyCheckin(slice, '2026-11-11', { lesson: 'u15-l10', finished: true });
    eq(S.predictedLesson(slice), null);
    ok(S.planPreview(slice, '2026-11-11', makeRng(2)).items.length > 0, 'still a review round after the last lesson');
  });

  test('tracker: the built round is a resumable session; finishing it books a preview day with the lesson', () => {
    const slice = trackerSlice();
    S.applyCheckin(slice, dayKeyToday(), { lesson: 'u04-l06', finished: false });
    const s = S.buildPreviewSession(slice, dayKeyToday(), makeRng(5));
    eq(s.kind, 'preview');
    eq(s.build, mods.build.BUILD);
    eq(s.phase, 'items', 'a round with a catch-up starts with the items');
    eq(s.introAt, 2);
    eq(s.lessonId, 'u04-l07');
    ok(mods.session.isResumable(s), 'the daily slot can resume it');
    for (const it of s.items) ok(checkAnswer(it.q, correctInput(it.q)).ok, 'a built question rejects its own answer');
    eq(s.items.map((i) => i.tag), ['catchup', 'catchup', 'preview', 'preview', 'preview', 'preview', 'review', 'review']);
    eq(s.items.map((i) => i.part), ['practice', 'practice', 'practice', 'practice', 'practice', 'practice', 'review', 'review']);

    s.results = s.items.map((i) => ({ part: i.part, topicId: i.topicId, ok: true }));
    const starsBefore = JSON.stringify(slice.stars);
    mods.focus.applySessionEnd(slice, s, dayKeyToday());
    const e = slice.history.at(-1);
    eq([e.kind, e.lesson, e.total, e.correct], ['preview', 'u04-l07', 8, 8]);
    eq(JSON.stringify(slice.stars), starsBefore, 'a warm-up completes no topic');
    eq(slice.streak.lastDay, dayKeyToday(), 'it counts as the day\'s learning');
    eq(s.summary.practice.total, 6);

    const view = S.previewTopicView('u04-l07');
    eq(view.title, 'Adding and subtracting fractions (2)');
    eq(mods.lesson.lessonSteps(view).at(-1).kind, 'checkin', 'the lesson screen walks it like a topic');
    S.applyCheckin(slice, dayKeyToday(), { lesson: 'u04-l06', finished: true });
    eq(S.buildPreviewSession(slice, dayKeyToday(), makeRng(5)).phase, 'explain', 'without a catch-up the intro opens the round');
  });

  test('tracker: hydrate gives an old state the tracker and hides English', () => {
    const old = shellStorage.defaultState();
    delete old.shell.englishOn;
    delete old.maths.y6.school;
    const h1 = shellStorage.hydrate(JSON.parse(JSON.stringify(old)));
    eq(h1.shell.englishOn, false, 'English is hidden on an existing install');
    eq(h1.maths.y6.school, { pos: null, lastCheckin: null, log: [], test: null });
    const kept = shellStorage.defaultState();
    kept.maths.y6.school = { pos: 'u04-l03', log: [{ day: '2026-11-09', lesson: 'u04-l03', finished: true, before: null }] };
    const h2 = shellStorage.hydrate(JSON.parse(JSON.stringify(kept)));
    eq(h2.maths.y6.school.pos, 'u04-l03', 'a stored position survives');
    eq(h2.maths.y6.school.lastCheckin, null, 'a missing key is filled one level deep');
    eq(h2.maths.y6.school.test, null, 'a B8 slice gains the B11 test slot');
    eq(h2.maths.y6.school.log.length, 1);
  });

  // ---- unit test practice (B11) ----

  test('test practice: the card is active until the test, and on the test day until the check-in', () => {
    const slice = trackerSlice();
    S.applyCheckin(slice, '2026-11-16', { lesson: 'u04-l11', finished: true });
    eq(S.testUnitDefault(slice), 4, 'the unit of the last reported lesson');
    eq(S.activeTest(slice, '2026-11-17'), null, 'nothing set');
    S.setTest(slice, 4, '2026-11-19', '2026-11-17');
    eq(S.activeTest(slice, '2026-11-17').unit, 4, 'two days ahead');
    eq(S.activeTest(slice, '2026-11-18').day, '2026-11-19', 'the day before');
    ok(S.activeTest(slice, '2026-11-19'), 'the test day, before checking in');
    S.applyCheckin(slice, '2026-11-19', { lesson: null });
    eq(S.activeTest(slice, '2026-11-19'), null, 'the test day after checking in');
    eq(S.activeTest(slice, '2026-11-20'), null, 'after the test');
  });

  test('test practice: "we had the test" logs it and ends the test practice', () => {
    const slice = trackerSlice();
    S.applyCheckin(slice, '2026-11-16', { lesson: 'u04-l11', finished: true });
    S.setTest(slice, 4, '2026-11-19', '2026-11-17');
    S.applyCheckin(slice, '2026-11-19', { lesson: null, note: 'test' });
    eq(slice.school.test, null);
    eq(slice.school.log.at(-1).note, 'test');
    eq(slice.school.pos, 'u04-l11', 'the test is not a lesson');
  });

  test('test practice: a full round is one question per lesson; the tricky round two per weak lesson', () => {
    const slice = trackerSlice();
    const s = S.buildTestSession(slice, dayKeyToday(), makeRng(9), 4);
    eq(s.kind, 'test');
    eq(s.testUnit, 4);
    eq(s.build, mods.build.BUILD);
    eq(s.items.length, 11, 'Unit 4 has eleven lessons');
    eq(new Set(s.items.map((i) => i.lessonId)).size, 11, 'one per lesson');
    ok(s.items.every((i) => i.lessonId.startsWith('u04-') && i.part === 'practice' && i.tag === 'test'));
    ok(s.items.every((i) => i.q.tier === S.TEST_TIER), 'the standard tier');
    for (const it of s.items) ok(checkAnswer(it.q, correctInput(it.q)).ok, it.lessonId + ': rejects its own answer');
    ok(mods.session.isResumable(s));

    const t = S.buildTestSession(slice, dayKeyToday(), makeRng(9), 4, ['u04-l08', 'u04-l09']);
    eq(t.tricky, true);
    eq(t.items.map((i) => [i.lessonId, i.q.tier]), [['u04-l08', 1], ['u04-l08', 2], ['u04-l09', 1], ['u04-l09', 2]]);
  });

  test('test week: switching between test practice and the warm-up parks the half-done round', () => {
    const slice = trackerSlice();
    S.applyCheckin(slice, dayKeyToday(), { lesson: 'u04-l11', finished: true });
    const Ss = mods.session;
    const preview = Ss.takeRound(slice, Ss.isPreviewRound, () => S.buildPreviewSession(slice, dayKeyToday(), makeRng(1)));
    preview.idx = 3; // part-way through
    const test = Ss.takeRound(slice, Ss.isTestRound(4), () => S.buildTestSession(slice, dayKeyToday(), makeRng(2), 4));
    eq(slice.activeSession, test, 'the test round takes the slot');
    eq(slice.parkedSession, preview, 'the warm-up waits instead of being thrown away');
    test.idx = 5;
    const back = Ss.takeRound(slice, Ss.isPreviewRound, () => { throw new Error('must not rebuild'); });
    eq(back, preview);
    eq(back.idx, 3, 'the warm-up continues where it stopped');
    eq(slice.parkedSession, test, 'and now the test round waits');
    eq(Ss.openRound(slice, Ss.isTestRound(4)).idx, 5, 'the card can still offer "continue"');

    // Tricky rounds match only their own lessons; a finished round is not parked.
    const tricky = Ss.isTestRound(4, ['u04-l09', 'u04-l08']);
    ok(tricky(S.buildTestSession(slice, dayKeyToday(), makeRng(3), 4, ['u04-l08', 'u04-l09'])), 'same lessons, any order');
    ok(!tricky(test), 'not the full round');
    ok(!Ss.isTestRound(4)(S.buildTestSession(slice, dayKeyToday(), makeRng(3), 4, ['u04-l08'])), 'the full-round match skips tricky rounds');
    slice.activeSession.phase = 'summary';
    slice.parkedSession = null;
    Ss.takeRound(slice, Ss.isTestRound(4), () => S.buildTestSession(slice, dayKeyToday(), makeRng(4), 4));
    eq(slice.parkedSession, null, 'a finished round is not parked');
  });

  test('test practice: results per lesson, and the history names the unit and the weak lessons', () => {
    const slice = trackerSlice();
    const s = S.buildTestSession(slice, dayKeyToday(), makeRng(4), 4);
    const wrong = new Set(['u04-l03', 'u04-l09']);
    s.results = s.items.map((i) => ({ part: i.part, topicId: i.topicId, lessonId: i.lessonId, ok: !wrong.has(i.lessonId) }));
    const rows = S.testResults(s);
    eq(rows.map((r) => r.lessonId), mods.lessons.lessonsOfUnit(4).map((l) => l.id), 'in book order');
    eq(S.weakLessons(s), ['u04-l03', 'u04-l09']);
    mods.focus.applySessionEnd(slice, s, dayKeyToday());
    const e = slice.history.at(-1);
    eq([e.kind, e.unit, e.weak, e.total, e.correct], ['test', 4, ['u04-l03', 'u04-l09'], 11, 9]);
    eq(slice.streak.lastDay, dayKeyToday(), 'test practice counts as the day\'s learning');
    eq(Object.keys(slice.stars).length, 0, 'and completes no topic');
  });

  // ==================== D. HUB STORAGE (fresh — pins the shell's design) ====================

  test('storage: defaultState shape', () => {
    const st = shellStorage.defaultState();
    eq(st.version, 1);
    eq(st.shell.streak, { count: 0, lastDay: null });
    eq(st.maths.active, 'y6');
    // The English module used to be a bare null placeholder ("empty until
    // phase B5" — see MEMORY.md); the Wordforge port replaced it with a real
    // slice. Shape pinned properly in the "englishState is present..." test
    // further down; this just confirms it is no longer null.
    ok(st.english && typeof st.english === 'object', 'the English module should be a real state slice now');
  });

  test('storage: the curriculum streak IS the shell streak (same object)', () => {
    const st = shellStorage.defaultState();
    ok(st.maths.y6.streak === st.shell.streak, 'slice.streak must be the very same object as shell.streak');
    finishSession(st.maths.y6, { kind: 'daily', topicId: 'x', total: 5, correct: 4 }, '2026-09-01');
    eq(st.shell.streak.count, 1, 'the shell streak advanced');
    eq(st.shell.streak.lastDay, '2026-09-01');
    eq(st.maths.y6.activeSession, null, 'finishSession clears the active session');
  });

  test('storage: a JSON round trip restores the alias', () => {
    const st = shellStorage.defaultState();
    finishSession(st.maths.y6, { kind: 'daily', topicId: 'x', total: 1, correct: 1 }, '2026-09-01');
    const restored = shellStorage.hydrate(JSON.parse(JSON.stringify(st)));
    ok(restored.maths.y6.streak === restored.shell.streak, 'the alias must be re-pointed after a round trip');
    eq(restored.shell.streak.count, 1, 'streak values survive the round trip');
    eq(restored.shell.streak.lastDay, '2026-09-01');
  });

  test('storage: exportJSON strips the API key and parseImport round-trips', () => {
    const st = shellStorage.defaultState();
    st.shell.apiKey = 'sk-secret';
    finishSession(st.maths.y6, { kind: 'daily', topicId: 'x', total: 1, correct: 1 }, '2026-09-01');
    const text = shellStorage.exportJSON(st);
    ok(!text.includes('sk-secret'), 'API key leaked into the backup');
    const back = shellStorage.parseImport(text);
    eq(back.shell.streak.count, 1, 'streak count survives');
    eq(back.shell.apiKey, '', 'apiKey comes back empty');
  });

  test('storage: parseImport rejects foreign JSON', () => {
    let threw = false;
    try { shellStorage.parseImport('{}'); } catch { threw = true; }
    ok(threw, 'should reject bare JSON');
    let threwY5 = false;
    const y5Export = JSON.stringify({ app: 'powermath-trainer', state: { version: 1 } });
    try { shellStorage.parseImport(y5Export); } catch { threwY5 = true; }
    ok(threwY5, 'should reject a powermath-trainer export');
  });

  function y5BackupText(name) {
    return JSON.stringify({
      app: 'powermath-trainer',
      state: {
        version: 1,
        settings: { name, apiKey: 'sk-secret' },
        mastery: { 'u08-x': { score: 70 } },
        stars: { 'u08-x': 3 },
        completed: ['u08-x'],
        diagnosticDone: true,
        history: [],
        attempts: [],
        qaLog: [],
        streak: { count: 9, lastDay: '2026-08-16' },
      },
    });
  }

  test('storage: importY5Backup builds a y5 slice and does not let the Y5 streak overwrite the shell', () => {
    const st = shellStorage.defaultState();
    shellStorage.importY5Backup(st, y5BackupText('Kid'));
    ok(st.maths.y5, 'y5 curriculum slice created');
    eq(st.maths.y5.completed, ['u08-x']);
    eq(st.maths.y5.settings.targetDate, null, 'the summer deadline does not come along');
    ok(st.maths.y5.streak === st.shell.streak, 'the y5 slice aliases the shell streak, like every other slice');
    eq(st.shell.streak.count, 0, 'the y5 backup streak (9) must NOT overwrite the shell streak');
    eq(st.shell.name, 'Kid', 'an empty shell name gets filled from the backup');
    ok(!JSON.stringify(st).includes('sk-secret'), 'the imported slice never carries the Y5 API key');
  });

  test('storage: importY5Backup keeps a name already set on this device', () => {
    const st = shellStorage.defaultState();
    st.shell.name = 'Theo';
    shellStorage.importY5Backup(st, y5BackupText('Kid'));
    eq(st.shell.name, 'Theo', 'a pre-set shell name must survive the import');
  });

  test('storage: capState caps attempts at 4000 and glossCache at 500, newest kept', () => {
    const st = shellStorage.defaultState();
    for (let i = 0; i < 4020; i++) st.maths.y6.attempts.push({ d: '2026-01-01', t: 'x', tier: 1, ok: 1 });
    for (let i = 0; i < 520; i++) st.maths.y6.glossCache['word' + i] = 'g' + i;
    shellStorage.capState(st);
    eq(st.maths.y6.attempts.length, 4000, 'attempts capped');
    eq(Object.keys(st.maths.y6.glossCache).length, 500, 'glossCache capped');
    ok(st.maths.y6.glossCache.word519 && !st.maths.y6.glossCache.word0, 'the oldest lookups are the ones dropped');
  });

  test('storage: hydrate fills every curriculumState field for a legacy-shaped state', () => {
    const s = shellStorage.hydrate({ version: 1, shell: { name: 'A' }, maths: { active: 'y6', y6: { completed: ['a'] } } });
    eq(s.shell.name, 'A', 'stored shell fields win');
    eq(s.maths.y6.completed, ['a'], 'stored completed list survives');
    eq(typeof s.maths.y6.glossCache, 'object', 'glossCache filled in');
    ok(Array.isArray(s.maths.y6.qaLog), 'qaLog filled in');
    ok(s.maths.y6.streak === s.shell.streak, 'the alias is restored even for a state missing new fields');
  });

  // ==================== E. GLOSSARY SMOKE (ported) ====================

  test('gloss: the offline glossary knows the maths vocabulary', () => {
    const { lookupGloss } = mods.glossary;
    ok(/Rest/.test(lookupGloss('remainder')), 'remainder');
    eq(lookupGloss('Fractions'), lookupGloss('fraction'), 'plural falls back to the entry');
    eq(lookupGloss('zzzqx'), null, 'an unknown word is null, not a guess');
  });

  test('gloss: the glossary covers the lesson text a child actually reads', () => {
    // Guards new content: a topic written with unglossed vocabulary silently
    // pushes the child onto the API — and offline, onto nothing. (Same rule as
    // the Y5 trainer; the glossary came along verbatim and grows here.)
    const { lookupGloss } = mods.glossary;
    let total = 0;
    let known = 0;
    for (const t of topics) {
      for (const seg of t.explanation?.segments ?? []) {
        for (const w of seg.text.replace(/<[^>]*>/g, ' ').match(/[A-Za-z][A-Za-z'-]*/g) ?? []) {
          total += 1;
          if (lookupGloss(w)) known += 1;
        }
      }
    }
    const pct = Math.round((known / total) * 100);
    ok(pct >= 90, `offline glossary covers only ${pct}% of explanation words (want >= 90%)`);
  });

  test('sw: precache names every module and the version moves', () => {
    ok(swText, 'sw.js did not load');
    ok(swText.includes(`'${mods.build.BUILD}'`),
      `CACHE_VERSION in sw.js and BUILD in shell/build.js must be the same string (BUILD is ${mods.build.BUILD})`);
    for (const p of ["'./js/maths/content/y6a.js'", "'./js/maths/content/y6a-u3u6.js'",
      "'./js/maths/content/y6a-frac.js'", "'./js/maths/content/glossary.js'",
      "'./js/maths/content/lessons.js'", "'./js/maths/content/y6a-lessons-u4.js'", "'./js/maths/content/y6a-lessons-u5u6.js'",
      "'./js/maths/content/y6b.js'", "'./js/maths/content/y6b-lessons-u7.js'", "'./js/maths/content/y6b-lessons-u8.js'",
      "'./js/maths/content/vis.js'",
      "'./js/maths/content/y5.js'", "'./js/maths/content/y5a.js'", "'./js/maths/content/y5b.js'", "'./js/maths/content/y5c.js'",
      "'./js/maths/content/diagnostic.js'", "'./js/ui/session.js'", "'./js/ui/today.js'",
      "'./js/ui/lesson.js'", "'./js/ui/gloss.js'", "'./js/ui/explain.js'", "'./js/ui/buddy.js'",
      "'./js/qa/tutor.js'", "'./js/qa/endpoint.js'", "'./js/tts.js'", "'./js/ui/map.js'", "'./js/ui/map-scene.js'",
      "'./js/ui/svg.js'", "'./js/shell/rhythm.js'", "'./js/maths/y5-bridge.js'",
      "'./js/english/engine/level.js'", "'./js/english/engine/story.js'", "'./js/english/engine/vocab.js'",
      "'./js/english/content/story-index.js'",
      "'./js/english/qa/claude.js'", "'./js/english/qa/genie.js'", "'./js/english/qa/gloss.js'", "'./js/english/qa/talk.js'",
      "'./js/english/ui/home.js'", "'./js/english/ui/read.js'", "'./js/english/ui/talk.js'", "'./js/english/ui/create.js'",
      "'./js/english/ui/parent-section.js'", "'./js/english/ui/speech.js'", "'./js/english/ui/stt.js'",
      "'./js/english/ui/audio.js'",
      "'./js/english/ui/world-scenes.js'",
      "'./data/story/signal/signal-01.json'", "'./data/story/signal/signal-12.json'"]) {
      ok(swText.includes(p), 'sw.js ASSETS missing ' + p);
    }
  });

  test('sw: English chapter MP3s are never precached, and the media cache survives a bump', () => {
    const block = swText.match(/const ASSETS = \[([\s\S]*?)\];/);
    ok(block, 'could not find the ASSETS array');
    ok(!block[1].includes('.mp3'), 'an MP3 was precached — it must be runtime-cached instead');
    ok(/k !== CACHE_VERSION && k !== MEDIA_CACHE/.test(swText), 'the media cache is not protected in activate');
  });

  // ==================== F. PRACTICE UI (ported seams) ====================

  test('lesson: steps split the explanation and end in the check-in gate', () => {
    const { lessonSteps, stepIndex, canPractise, markCheckedIn } = mods.lesson;
    const t = topicById('u02-divide');
    const steps = lessonSteps(t);
    eq(steps.at(-1).kind, 'checkin', 'the last step is always the check-in');
    ok(steps.length >= 2, 'a real topic has at least one part plus the gate');
    ok(!canPractise({ segIdx: 0 }), 'practice locked before the check-in');
    const s = { segIdx: 2 };
    markCheckedIn(s);
    ok(canPractise(s), 'both check-in answers unlock via markCheckedIn');
    eq(stepIndex({ segIdx: 999 }, t), steps.length - 1, 'a stray stored index clamps');
    eq(stepIndex({}, t), 0, 'a session from before the feature starts at 0');
  });

  test('gloss: tokenizing wraps words, leaves numbers and fractions alone', () => {
    const el = document.createElement('div');
    el.innerHTML = 'Round 3,450 to the nearest <b>100</b>. '
      + '<span class="frac"><b>3</b><i>4</i></span> of the pizza is left.';
    const before = el.textContent;
    mods.gloss.tokenizeInto(el);
    eq(el.textContent, before, 'visible text unchanged');
    const words = [...el.querySelectorAll('button.w')].map((b) => b.textContent);
    ok(words.includes('Round') && words.includes('pizza'), 'words are tappable');
    ok(!words.some((w) => /\d/.test(w)), 'no number is ever wrapped');
    eq(el.querySelector('.frac').querySelectorAll('button').length, 0, 'fraction stack untouched');
  });

  test('focus: a catch-up session uses the short ramp, a map lesson the full one', () => {
    const { buildFocusSession, CATCHUP_TOPIC_TIERS } = mods.focus;
    const state = shellStorage.defaultState().maths.y6;
    const short = buildFocusSession(state, 'u01-pv10m', 'new', '2026-09-01', makeRng(5), 'today');
    eq(short.items.length, CATCHUP_TOPIC_TIERS.length, 'today-origin ramp is short');
    eq(short.kind, 'focus-new');
    const full = buildFocusSession(state, 'u01-pv10m', 'new', '2026-09-01', makeRng(5), 'map');
    eq(full.items.length, NEW_TOPIC_TIERS.length, 'map-origin ramp is the full one');
  });

  test('diagnostic: >= 2 items per 6A strand and the checker accepts each answer', () => {
    const items = mods.content.diagnosticItems(makeRng(seedFromString('diag')));
    const perStrand = {};
    for (const q of items) {
      perStrand[q.strand] = (perStrand[q.strand] || 0) + 1;
      ok(['place', 'fourops', 'fractions', 'position'].includes(q.strand), 'strand key exists in 6A');
      ok(checkAnswer(q, correctInput(q)).ok, `diagnostic item rejects its own answer: ${q.prompt}`);
    }
    for (const s of ['place', 'fourops', 'fractions', 'position']) {
      ok((perStrand[s] || 0) >= 2, `strand ${s} has fewer than 2 diagnostic items (prior would be noise)`);
    }
  });

  test('map: regions are the contiguous strand runs, one per island', () => {
    const { deriveRegions } = mods.mapScene;
    const regions = deriveRegions(topics);
    eq(regions.reduce((n, r) => n + r.count, 0), topics.length, 'every topic sits in exactly one region');
    // Contiguity again, but from the map's own point of view: a strand that
    // reappears would produce two islands with the same signpost.
    const strands = regions.map((r) => r.strand);
    eq(new Set(strands).size, strands.length, 'a strand must not open a second island');
    // Offsets line up: each region starts where the previous one ended.
    let at = 0;
    for (const r of regions) { eq(r.start, at, 'region start offset'); at += r.count; }
  });

  test('map: every strand has a tint and neighbouring islands differ', () => {
    const { deriveRegions, TINTS } = mods.mapScene;
    for (const key of Object.keys(mods.content.STRANDS)) {
      ok(TINTS[key], `strand ${key} has no map tint — its island would fall back to grey`);
    }
    const regions = deriveRegions(topics);
    for (let i = 1; i < regions.length; i++) {
      ok(TINTS[regions[i].strand] !== TINTS[regions[i - 1].strand],
        `islands ${regions[i - 1].strand} and ${regions[i].strand} share a colour and read as one`);
    }
  });

  test('map: stations carry status, the ship sits on the scheduler pick', () => {
    const { buildTreasureMap } = mods.mapScene;
    const slice = shellStorage.defaultState().maths.y6;
    slice.diagnosticDone = true;
    slice.completed.push(topicOrder[0]);
    slice.stars[topicOrder[0]] = 3;
    slice.mastery[topicOrder[0]] = newMastery(90);
    const next = nextNewTopic(slice, topicOrder, journeyMeta);
    const { svg, currentEl, allDone, doneCount } = buildTreasureMap({
      topics, strands: mods.content.STRANDS, state: slice, nextTopicId: next,
    });
    eq(doneCount, 1);
    ok(!allDone, 'one done topic is not the whole journey');
    eq(svg.querySelectorAll('.tmap-station').length, topics.length, 'one station per topic');
    eq(currentEl.getAttribute('data-topic'), next, 'the ship marks the scheduler pick');
    ok(svg.querySelector(`.tmap-station[data-topic="${topicOrder[0]}"]`).classList.contains('done'));
    ok(svg.querySelector('.tmap-fog'), 'the future is fogged while topics remain');
    // No Watch in Lernapp: the signposts must not have come along.
    eq(svg.querySelectorAll('.tmap-watch').length, 0, 'no Watch signposts');
  });

  test('map: a finished journey opens the chest and lifts the fog', () => {
    const { buildTreasureMap } = mods.mapScene;
    const slice = shellStorage.defaultState().maths.y6;
    slice.diagnosticDone = true;
    for (const id of topicOrder) { slice.completed.push(id); slice.stars[id] = 3; }
    const { svg, allDone, doneCount, currentEl } = buildTreasureMap({
      topics, strands: mods.content.STRANDS, state: slice,
      nextTopicId: nextNewTopic(slice, topicOrder, journeyMeta),
    });
    ok(allDone, 'nothing left to learn');
    eq(doneCount, topics.length);
    eq(currentEl, null, 'no ship once every island is visited');
    ok(!svg.querySelector('.tmap-fog'), 'fog is gone');
    ok(svg.querySelector('.tmap-chest').classList.contains('open'), 'the chest opens');
  });

  test('map: a station tap is gated before the diagnostic and on locked islands', () => {
    const { stationAction } = mods.focus;
    const slice = shellStorage.defaultState().maths.y6;
    const t = topicById(topicOrder[0]);
    eq(stationAction(slice, t, 'current').kind, 'toast', 'warm-up check comes first');
    slice.diagnosticDone = true;
    eq(stationAction(slice, t, 'locked').kind, 'toast', 'locked islands stay shut');
    eq(stationAction(slice, t, 'current').mode, 'new', 'the current island starts a lesson');
    eq(stationAction(slice, t, 'open').mode, 'new', 'a stepped-over island also starts a lesson');
    eq(stationAction(slice, t, 'done').mode, 'review', 'a finished island opens as review');
  });

  test('parent: the vocabulary view aggregates taps by word, not by tap', () => {
    // The parent corner groups gloss entries with normaliseWord, so "Fractions"
    // and "fractions," land on one row. Pinned here because that view is the
    // whole reason the taps are logged.
    const { normaliseWord } = mods.glossary;
    const log = [
      { day: '2026-09-01', q: 'remainder', a: 'der Rest', source: 'gloss' },
      { day: '2026-09-02', q: 'Remainder', a: 'der Rest', source: 'gloss' },
      { day: '2026-09-02', q: 'remainder,', a: 'der Rest', source: 'gloss' },
      { day: '2026-09-02', q: 'column', a: 'die Spalte', source: 'gloss' },
      { day: '2026-09-02', q: 'Explanation reopened', a: 'x', source: 'reexplain' },
      { day: '2026-09-02', q: 'why?', a: 'because', source: 'ai' },
    ];
    const vocab = new Map();
    for (const e of log) {
      if (e.source !== 'gloss') continue;
      const key = normaliseWord(e.q) || String(e.q).toLowerCase();
      const seen = vocab.get(key);
      if (seen) seen.n += 1; else vocab.set(key, { n: 1 });
    }
    eq([...vocab.keys()].sort(), ['column', 'remainder'], 'only glosses, grouped by normalised word');
    eq(vocab.get('remainder').n, 3, 'case and punctuation variants are one word');
  });

  test('parent: a restored backup keeps the key typed on THIS device', () => {
    // Backups never contain a key, so a naive restore would silently wipe it.
    const st = shellStorage.defaultState();
    st.shell.apiKey = 'sk-on-this-device';
    st.shell.name = 'Kid';
    const backup = shellStorage.exportJSON(st);
    ok(!backup.includes('sk-on-this-device'), 'the export strips the key');
    const imported = shellStorage.parseImport(backup);
    eq(imported.shell.apiKey, '', 'the imported state has no key');
    imported.shell.apiKey = st.shell.apiKey; // what parent.js does on restore
    eq(imported.shell.apiKey, 'sk-on-this-device');
    eq(imported.shell.name, 'Kid', 'the rest of the shell round-trips');
  });

  // ==================== G. RHYTHM (stretch across the school year) ====================

  test('rhythm: maths and English alternate, stably', () => {
    const { subjectOfDay } = mods.rhythm;
    const days = ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04'];
    const seq = days.map(subjectOfDay);
    eq(seq[0], seq[2], 'same subject every other day');
    ok(seq[0] !== seq[1], 'neighbouring days differ');
    eq(subjectOfDay('2026-09-01'), subjectOfDay('2026-09-01'), 'stable for a given day');
    ok(seq.includes('maths') && seq.includes('english'), 'both subjects occur');
  });

  test('rhythm: a new topic waits out the cadence', () => {
    const { mayStartNewTopic, dayPlan } = mods.rhythm;
    const slice = shellStorage.defaultState().maths.y6;
    ok(mayStartNewTopic(slice, '2026-09-01', 6), 'nothing started yet — go ahead');
    slice.history.push({ day: '2026-09-01', kind: 'daily', topicId: 'u01-pv10m', total: 11, correct: 9, minutes: 10 });
    ok(!mayStartNewTopic(slice, '2026-09-03', 6), 'two days later is too soon');
    ok(mayStartNewTopic(slice, '2026-09-07', 6), 'six days later is fine');
    ok(mayStartNewTopic(slice, '2026-09-03', 0), 'a zero interval switches the throttle off');
    // Review-only sessions must not reset the clock.
    slice.history.push({ day: '2026-09-05', kind: 'review', topicId: null, total: 10, correct: 8, minutes: 7 });
    eq(mods.rhythm.lastNewTopicDay(slice), '2026-09-01', 'a review day is not a new topic');
    const plan = dayPlan(slice, '2026-09-03', 6);
    ok(plan.daysToNext > 0, 'the card can say how long the wait is');
  });

  test('rhythm: planSession honours the throttle and the deferrals', () => {
    const slice = shellStorage.defaultState().maths.y6;
    slice.diagnosticDone = true;
    const open = planSession(slice, topicOrder, '2026-09-01', makeRng(3), journeyMeta);
    eq(open.kind, 'daily', 'by default a new topic is offered');

    // Before anything is finished there is nothing to review, so the throttle
    // has to give way: holding the topic back would open a session with no
    // questions in it at all.
    const first = planSession(slice, topicOrder, '2026-09-01', makeRng(3), journeyMeta, { allowNewTopic: false });
    eq(first.kind, 'daily', 'an empty session is never the answer');

    // Once a topic is done, the throttle does its job.
    slice.completed.push(open.newTopic);
    slice.mastery[open.newTopic] = { score: 70, attempts: 7, correct: 5, lastSeen: '2026-09-01', due: '2026-09-01', box: 2 };
    const held = planSession(slice, topicOrder, '2026-09-01', makeRng(3), journeyMeta, { allowNewTopic: false });
    eq(held.kind, 'review', 'the throttle turns the day into review');
    eq(held.newTopic, null);
    slice.completed.pop();
    delete slice.mastery[open.newTopic];
    const skipped = planSession(slice, topicOrder, '2026-09-01', makeRng(3), journeyMeta, { skip: [open.newTopic] });
    ok(skipped.newTopic && skipped.newTopic !== open.newTopic, 'a deferred topic is passed over');
  });

  test('rhythm: a deferral expires on its own and can be lifted early', () => {
    const { deferTopic, activeDeferrals, undeferTopic, DEFER_DAYS } = mods.rhythm;
    const slice = shellStorage.defaultState().maths.y6;
    deferTopic(slice, 'u02-divide', '2026-09-01');
    eq(activeDeferrals(slice, '2026-09-05'), ['u02-divide'], 'still held back mid-week');
    eq(DEFER_DAYS, 7, 'a deferred topic returns the following week');
    eq(activeDeferrals(slice, addDays('2026-09-01', DEFER_DAYS)), [], 'expires by itself');
    deferTopic(slice, 'u03-factors', '2026-09-02');
    undeferTopic(slice, 'u03-factors');
    eq(activeDeferrals(slice, '2026-09-05'), ['u02-divide'], 'the parent can lift one early');
  });

  test('rhythm: the pacing default rides along in a new state and a backup', () => {
    const st = shellStorage.defaultState();
    eq(st.maths.y6.settings.newTopicEveryDays, 6, 'a school-year cadence by default');
    eq(st.maths.y6.deferred, {}, 'a fresh state defers nothing');
    // A state written before this release has neither field.
    const old = shellStorage.hydrate({ version: 1, maths: { active: 'y6', y6: { completed: ['u01-pv10m'] } } });
    eq(old.maths.y6.settings.newTopicEveryDays, 6, 'hydrate fills the new setting');
    eq(old.maths.y6.deferred, {}, 'hydrate fills the deferral record');
    eq(old.maths.y6.completed, ['u01-pv10m'], 'without losing what was stored');
  });

  test('tutor: prompts speak to Year 6 and the gloss prompt still bans solving', () => {
    const sys = mods.tutor.buddySystemPrompt({ topicName: 'Fractions' });
    ok(/Year 6/.test(sys), 'buddy prompt updated for Y6');
    const g = mods.tutor.glossSystemPrompt();
    ok(/Rechne NIEMALS/i.test(g) && /NUR dieses eine Wort/i.test(g), 'gloss prompt unchanged in spirit');
    ok(!mods.tutor.translateSystemPrompt && !mods.tutor.wordHelpSystemPrompt, 'no full-text German paths');
  });

  test('journey: 6A covers all topics once, strands contiguous, prereqs honoured', () => {
    const { PREREQS } = mods.content;
    ok(topicOrder.length >= 13, `expected the 13 6A topics, got ${topicOrder.length}`);
    eq(new Set(topicOrder).size, topicOrder.length, 'no duplicate topic ids');
    // Strand contiguity: once a strand's run ends, it must not reappear
    // (map regions derive from consecutive runs).
    const seen = new Set();
    let last = null;
    for (const id of topicOrder) {
      const s = journeyMeta.strandOf(id);
      ok(s, `topic ${id} has a strand`);
      if (s !== last) {
        ok(!seen.has(s), `strand ${s} appears in two separate runs`);
        seen.add(s);
        last = s;
      }
    }
    // The spine's decimals edge went live with Unit 7 (B9).
    eq(PREREQS['u07-dec-place'], ['u01-pv10m'], 'decimals build on place value to 10,000,000');
    // ...and the percentages edges with Unit 8 (B10).
    eq(PREREQS['u08-pct-of'], ['u05-frac-amount'], 'a percentage of an amount is a fraction of it');
    eq(PREREQS['u08-pct-equiv'], ['u04-simplify'], 'per cent to fraction means simplifying');
    // Every prereq edge points at an existing, earlier topic.
    for (const [id, reqs] of Object.entries(PREREQS)) {
      ok(topicById(id), `PREREQS names unknown topic ${id}`);
      for (const r of reqs) {
        ok(topicById(r), `prereq ${r} of ${id} does not exist`);
        ok(topicOrder.indexOf(r) < topicOrder.indexOf(id), `prereq ${r} comes after ${id} in book order`);
      }
    }
    // Units ascend through the book array — the source of strand contiguity.
    const units = topicOrder.map((id) => topicById(id).unit);
    for (let i = 1; i < units.length; i++) ok(units[i] >= units[i - 1], 'units out of order');
  });

  // ==================== H. ENGLISH (Wordforge port) ====================

  test('storage: englishState is present in defaultState, minus the shell-owned fields', () => {
    const st = shellStorage.defaultState();
    ok(st.english, 'english slice missing');
    eq(st.english.tokens, 0);
    eq(st.english.story, { arcId: 'signal', chapterIndex: 0, completed: [], abandoned: [] });
    eq(st.english.level, { band: 4, history: [] });
    eq(st.english.settings, { geminiKey: '', dailyImageCap: 3, speechEnabled: true });
    ok(!('apiKey' in st.english.settings), 'the Anthropic key must live on shell, not english.settings');
    ok(!('name' in st.english), 'the child name must live on shell, not english');
  });

  test('storage: hydrate fills English fields for a legacy state without losing what was stored', () => {
    const old = shellStorage.hydrate({
      version: 1,
      shell: { name: 'A' },
      maths: { active: 'y6', y6: { completed: ['a'] } },
      english: { tokens: 5, story: { arcId: 'signal', completed: ['signal-01'] } },
    });
    eq(old.english.tokens, 5, 'stored English progress survives');
    eq(old.english.story.completed, ['signal-01'], 'stored story progress survives');
    eq(old.english.story.arcId, 'signal', 'stored field wins');
    eq(old.english.level, { band: 4, history: [] }, 'a field never stored gets the default');
    eq(old.english.settings.dailyImageCap, 3, 'a new nested settings key is filled in');
  });

  test('storage: hydrate never drops the whole English module for a pre-port state (english: null)', () => {
    const legacy = shellStorage.hydrate({ version: 1, shell: {}, maths: { active: 'y6' }, english: null });
    ok(legacy.english, 'a state saved before the English port must still gain the module');
    eq(legacy.english.tokens, 0);
  });

  test('storage: capState caps the English ring buffers, newest kept', () => {
    const st = shellStorage.defaultState();
    for (let i = 0; i < 420; i++) st.english.sessions.push({ day: '2026-01-01', chapterId: 'x' + i });
    for (let i = 0; i < 420; i++) st.english.promptLog.push({ day: '2026-01-01', prompt: 'x' + i });
    for (let i = 0; i < 40; i++) st.english.images.push({ day: '2026-01-01', prompt: 'x' + i, dataUri: 'd' + i });
    for (let i = 0; i < 520; i++) st.english.glossCache['word' + i] = { de: 'g' + i };
    shellStorage.capState(st);
    eq(st.english.sessions.length, 400, 'sessions capped');
    eq(st.english.promptLog.length, 400, 'promptLog capped');
    eq(st.english.images.length, 30, 'images capped');
    eq(Object.keys(st.english.glossCache).length, 500, 'glossCache capped');
    ok(st.english.glossCache.word519 && !st.english.glossCache.word0, 'the oldest lookups are the ones dropped');
    ok(st.english.sessions[st.english.sessions.length - 1].chapterId === 'x419', 'the newest session survives');
  });

  test('en: vocab — a gloss tap moves the score DOWN, reading moves it up weakly', () => {
    const a = mods.enVocab.newWord(50);
    mods.enVocab.updateWord(a, 'gloss');
    ok(a.score < 50, 'gloss did not lower the score');
    const b = mods.enVocab.newWord(50);
    mods.enVocab.updateWord(b, 'read');
    ok(b.score > 50, 'reading did not raise the score');
  });

  test('en: vocab — normalise strips punctuation but keeps internal apostrophes', () => {
    eq(mods.enVocab.normalise('Robot,'), 'robot');
    eq(mods.enVocab.normalise("don't"), "don't");
  });

  test('en: level — two hard chapters lower the band, two easy ones need comprehension too', () => {
    const entry = (over = {}) => mods.enLevel.makeEntry({
      day: '2026-08-11', chapterId: 'c', band: 4, words: 200, seconds: 120,
      glossTaps: 6, talkScore: 80, finished: true, ...over,
    });
    const hard = entry({ glossTaps: 20 });
    eq(mods.enLevel.decide({ band: 4, history: [hard, hard] }).move, -1);
    const easyButLost = entry({ glossTaps: 1, talkScore: 40 });
    eq(mods.enLevel.decide({ band: 4, history: [easyButLost, easyButLost] }).move, 0,
      'raised the band despite poor comprehension');
  });

  test('en: level — reading TIME never moves the band on its own', () => {
    const entry = (over = {}) => mods.enLevel.makeEntry({
      day: '2026-08-11', chapterId: 'c', band: 4, words: 200, seconds: 120,
      glossTaps: 6, talkScore: 80, finished: true, ...over,
    });
    const quick = entry({ seconds: 40 }), slow = entry({ seconds: 900 });
    eq(mods.enLevel.decide({ band: 4, history: [quick, quick] }).move,
       mods.enLevel.decide({ band: 4, history: [slow, slow] }).move);
  });

  test('en: genie — validateScene rejects invented sprites and dangling relations', () => {
    eq(mods.enGenie.validateScene({ ...mods.enGenie.emptyScene(), biome: 'volcano' }).length, 1);
    const dangling = { ...mods.enGenie.emptyScene(), relations: [{ subject: 'robot', rel: 'behind', object: 'tree' }] };
    ok(mods.enGenie.validateScene(dangling).length >= 2, 'dangling relation accepted');
  });

  test('en: genie — the model cannot award a power word he never typed', () => {
    eq(mods.enGenie.powerWordsPresent('the rusty robot crept away', ['rusty', 'crept', 'hollow']), ['rusty', 'crept']);
    eq(mods.enGenie.powerWordsPresent('nothing here', ['rusty']), []);
  });

  test('en: genie — every sprite kind in the vocabulary has a renderer', () => {
    for (const k of [...mods.enGenie.ACTORS, ...mods.enGenie.PROPS]) {
      ok(mods.enScenes.SPRITE_KINDS.includes(k), `no sprite drawn for "${k}"`);
    }
  });

  test('en: claude — drainSSE handles an event split across reader chunks', () => {
    const a = mods.enClaude.drainSSE('data: {"type":"x"}\n\ndata: {"ty');
    eq(a.events.length, 1);
    const b = mods.enClaude.drainSSE(a.rest + 'pe":"y"}\n\n');
    eq(b.events[0].type, 'y');
  });

  test('en: claude — parseJSON survives fences and trailing prose', () => {
    eq(mods.enClaude.parseJSON('```json\n{"a":2}\n```', ''), { a: 2 });
    eq(mods.enClaude.parseJSON('"a":3} Hope that helps!'), { a: 3 });
  });

  test('en: scenes — "behind" puts the subject further back and smaller', () => {
    const items = mods.enScenes.layout({
      ...mods.enGenie.emptyScene(),
      actors: [{ kind: 'fox', pos: 'centre', state: 'standing' }],
      props: [{ kind: 'tree', pos: 'centre', size: 'medium' }],
      relations: [{ subject: 'fox', rel: 'behind', object: 'tree' }],
    });
    const fox = items.find((i) => i.kind === 'fox');
    const tree = items.find((i) => i.kind === 'tree');
    ok(fox.z < tree.z && fox.scale < 1, 'behind did not push the fox back and shrink it');
  });

  test('en: scenes — renderScene builds an SVG on a detached DOM', () => {
    const svg = mods.enScenes.renderScene({
      biome: 'forest', time: 'night', weather: 'rain',
      actors: [{ kind: 'robot', pos: 'centre', state: 'hiding' }],
      props: [{ kind: 'tree', pos: 'left', size: 'large' }],
      relations: [{ subject: 'robot', rel: 'behind', object: 'tree' }],
    });
    eq(svg.tagName, 'svg');
    ok(svg.querySelectorAll('g').length > 0, 'no sprite groups drawn');
  });

  test('en: read — splitWords keeps whitespace and strips punctuation for lookup', () => {
    const parts = mods.enRead.splitWords('The rusty robot, again.');
    eq(parts.filter((p) => p.word).map((p) => p.word), ['the', 'rusty', 'robot', 'again']);
    eq(parts.map((p) => p.space ?? p.raw).join(''), 'The rusty robot, again.');
  });

  test('en: story — validateChapter catches a power word missing from the prose', () => {
    const ch = {
      id: 'x', arc: 'a', title: 'T', level: 3,
      power: ['one', 'two', 'three'],
      glossary: { one: { de: 'eins', en: 'a number' }, two: { de: 'zwei', en: 'a number' }, three: { de: 'drei', en: 'a number' } },
      steps: [{ id: 'p1', text: 'one two only.' }],
      talk: [{ q: 'q', expect: ['a'] }],
    };
    const errs = mods.enStory.validateChapter(ch);
    eq(errs.length, 1);
    ok(errs[0].includes('"three" never appears'), errs[0]);
  });

  test('en: talk — talkScore null (unintelligible speech) never counts as zero', () => {
    eq(mods.enTalk.talkScore([{ score: null }, { score: 80 }]), 80);
    eq(mods.enTalk.talkScore([{ score: null }]), null);
  });

  // ---- shipped corpus sweep (the 12 signal-arc chapters) ----
  const enPaths = mods.enIndex.allChapterPaths();
  const enChapters = [];
  await atest(`en corpus: all ${enPaths.length} registered chapters load`, async () => {
    for (const p of enPaths) {
      const res = await fetch('../' + p.replace(/^\.\//, ''));
      ok(res.ok, `${p}: HTTP ${res.status}`);
      enChapters.push(await res.json());
    }
  });

  test('en corpus: every chapter passes validateChapter', () => {
    const errs = enChapters.flatMap((c) => mods.enStory.validateChapter(c));
    ok(errs.length === 0, errs.join(' | '));
  });

  test('en corpus: registry metadata matches the chapter files', () => {
    const reg = mods.enIndex.ARCS.flatMap((a) => a.chapters.map((c) => ({ ...c, arc: a.id })));
    for (const ch of enChapters) {
      const r = reg.find((x) => x.id === ch.id);
      ok(r, `${ch.id} is not in the registry`);
      eq([ch.level, ch.title, ch.arc], [r.level, r.title, r.arc], `${ch.id} metadata drift`);
    }
  });

  test('en corpus: every scene descriptor is renderable', () => {
    for (const ch of enChapters) {
      for (const st of ch.steps) {
        const errs = mods.enGenie.validateScene(st.scene);
        ok(errs.length === 0, `${ch.id}/${st.id}: ${errs.join(', ')}`);
      }
    }
  });

  test('en corpus: power words are never reused across chapters', () => {
    const seen = new Map();
    for (const ch of enChapters) {
      for (const w of ch.power) {
        ok(!seen.has(w), `"${w}" is a power word in both ${seen.get(w)} and ${ch.id}`);
        seen.set(w, ch.id);
      }
    }
  });

  // ==================== H. ENDPOINT (server proxy vs device key) ====================

  test('sw: the service worker never intercepts a non-GET request', () => {
    // The app POSTs to its own origin now. A cache-first handler would try to
    // cache the POST (the Cache API rejects it) and would clone a streaming
    // answer for nothing — the guard has to come before anything else.
    ok(swText, 'sw.js did not load');
    const handler = swText.slice(swText.indexOf("addEventListener('fetch'"));
    const guard = handler.indexOf("method !== 'GET'");
    const firstRespond = handler.indexOf('respondWith');
    ok(guard > -1, 'no non-GET guard in the fetch handler');
    ok(guard < firstRespond, 'the guard must come before any respondWith');
  });

  await atest('endpoint: a 404 from a static host is not mistaken for a proxy answer', async () => {
    // GitHub Pages answers a POST to a missing path with its 404 HTML page;
    // Cloudflare Pages answers /api/chat with JSON or an SSE stream. Getting
    // this wrong would send every question into the void on the static build.
    const { postMessages, resetProxyProbe, usingProxy } = mods.endpoint;
    const real = window.fetch;
    const calls = [];
    try {
      resetProxyProbe();
      window.fetch = async (url, opts) => {
        calls.push(String(url));
        if (String(url).includes('/api/chat')) {
          return new Response('<!doctype html><title>404</title>', { status: 404, headers: { 'content-type': 'text/html' } });
        }
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } });
      };
      const res = await postMessages('{}', { apiKey: 'sk-test' });
      eq(res.status, 200, 'falls through to the direct call');
      ok(calls.some((u) => u.includes('/api/chat')), 'the proxy is tried first');
      ok(calls.some((u) => u.includes('api.anthropic.com')), 'then the direct endpoint');
      ok(!usingProxy(), 'and it remembers there is no proxy');
      // Second call must not probe again — the answer cannot change mid-page.
      calls.length = 0;
      await postMessages('{}', { apiKey: 'sk-test' });
      ok(!calls.some((u) => u.includes('/api/chat')), 'the probe result is cached');
    } finally {
      window.fetch = real;
      resetProxyProbe();
    }
  });

  await atest('endpoint: a real proxy answer is used and no key is needed', async () => {
    const { postMessages, resetProxyProbe, usingProxy } = mods.endpoint;
    const real = window.fetch;
    const calls = [];
    try {
      resetProxyProbe();
      window.fetch = async (url) => {
        calls.push(String(url));
        return new Response('data: {}', { status: 200, headers: { 'content-type': 'text/event-stream' } });
      };
      const res = await postMessages('{}', {});   // deliberately NO key
      eq(res.status, 200);
      ok(usingProxy(), 'an SSE answer means a proxy is there');
      ok(!calls.some((u) => u.includes('api.anthropic.com')), 'the key path is never touched');
    } finally {
      window.fetch = real;
      resetProxyProbe();
    }
  });

  await atest('endpoint: no proxy and no key fails loudly rather than silently', async () => {
    const { postMessages, resetProxyProbe } = mods.endpoint;
    const real = window.fetch;
    try {
      resetProxyProbe();
      window.fetch = async () => new Response('nope', { status: 404, headers: { 'content-type': 'text/html' } });
      const res = await postMessages('{}', {});
      ok(!res.ok, 'the caller sees a failure it can report');
    } finally {
      window.fetch = real;
      resetProxyProbe();
    }
  });


  // ------------------------------------------------------- Year 5 -> Year 6

  // A backup with real Year 5 topic ids, one strong strand and one weak one.
  function y5Real({ strong = 90, weak = 20 } = {}) {
    return JSON.stringify({
      app: 'powermath-trainer',
      state: {
        version: 1,
        settings: { name: 'Kid' },
        mastery: {
          'u01-pv100k': { score: strong }, 'u02-pv1m': { score: strong },   // place
          'u03-column': { score: weak }, 'u07-division': { score: weak },   // -> fourops
          'u08-equivalent': { score: 60 },                                  // fractions
          'u15-position': { score: 75 },                                    // -> position
        },
        stars: {},
        completed: ['u01-pv100k', 'u02-pv1m', 'u03-column', 'u07-division', 'u08-equivalent', 'u15-position'],
        diagnosticDone: true,
        history: [], attempts: [], qaLog: [],
      },
    });
  }

  test('y5-bridge: an imported Year 5 backup seeds the Year 6 priors and retires the warm-up check', () => {
    const { seedY6FromY5, priorFromY5 } = mods.y5bridge;
    const st = shellStorage.defaultState();
    shellStorage.importY5Backup(st, y5Real());
    ok(!st.maths.y6.diagnosticDone, 'the import alone must not touch the y6 slice');
    ok(seedY6FromY5(st), 'seeding runs when there is a y5 slice and no y6 evidence');

    const y6 = st.maths.y6;
    ok(y6.diagnosticDone, 'the warm-up check is retired');
    for (const t of topics) ok(y6.mastery[t.id], `every topic gets a prior: ${t.id}`);
    const place = y6.mastery[topics.find((t) => t.strand === 'place').id].score;
    const fourops = y6.mastery[topics.find((t) => t.strand === 'fourops').id].score;
    ok(place > fourops, 'a strong Year 5 strand starts above a weak one');
    eq(place, priorFromY5(90), 'place comes straight from the Year 5 mean');
    ok(place <= 85, 'no topic starts in the secure band before it has been practised');
    ok(fourops >= 30, 'and no topic starts below the floor');
  });

  test('y5-bridge: shrinks towards the middle and never overwrites real Year 6 work', () => {
    const { seedY6FromY5, priorFromY5 } = mods.y5bridge;
    eq(priorFromY5(50), 50, 'a middling Year 5 stays middling');
    ok(priorFromY5(100) < 100, 'a perfect Year 5 is still not a mastered Year 6 topic');
    ok(priorFromY5(0) > 0, 'and a bad Year 5 leaves room to fall');

    const st = shellStorage.defaultState();
    shellStorage.importY5Backup(st, y5Real());
    ok(seedY6FromY5(st), 'first run seeds');
    ok(!seedY6FromY5(st), 'second run is a no-op: idempotent, so it can run on every launch');

    // Evidence of any kind blocks it, even before the check is marked done.
    const fresh = shellStorage.defaultState();
    shellStorage.importY5Backup(fresh, y5Real());
    fresh.maths.y6.attempts.push({ d: '2026-09-01', t: 'u01-pv10m', tier: 1, ok: 1 });
    ok(!seedY6FromY5(fresh), 'a single answered question is worth more than a borrowed prior');
  });

  // ------------------------------------------------- Year 5 review pool (B4)

  test('y5 content: 32 topics, ids never collide with Year 6, resolvable by id and strand', () => {
    const { Y5_TO_Y6_STRAND, y6StrandOfY5 } = mods.y5;
    eq(y5Topics.length, 32, 'the whole Year 5 trainer came along');
    eq(new Set(y5Topics.map((t) => t.id)).size, 32, 'no duplicate Year 5 ids');
    const y6ids = new Set(topicOrder);
    for (const t of y5Topics) {
      ok(!y6ids.has(t.id), `Year 5 id ${t.id} collides with a Year 6 topic — the y5 slice keys would be ambiguous`);
      ok(Y5_TO_Y6_STRAND[t.strand], `Year 5 strand ${t.strand} (${t.id}) has no Year 6 mapping`);
      ok(t.explanation?.segments?.length && t.example?.steps?.length, `${t.id}: same lesson shape as Year 6 (explanation sheet, tutor notes)`);
    }
    // index.js resolves both years by id, but the journey stays Year 6.
    eq(topicById('u03-column')?.shortTitle, 'Column + and −');
    ok(!isY6Topic('u03-column') && isY6Topic('u02-addsub'));
    ok(!topicOrder.includes('u03-column'), 'a Year 5 topic is never part of the journey');
    // The scheduler's variety rule sees Year 6 strand names for Year 5 topics.
    eq(journeyMeta.strandOf('u03-column'), 'fourops');
    eq(journeyMeta.strandOf('u07-division'), 'fourops');
    eq(journeyMeta.strandOf('u13-angle-types'), 'position');
    eq(y6StrandOfY5('nope'), null);
    eq(journeyMeta.strandOf('nope'), null);
  });

  test('y5-bridge: the Year 5 topics join the Year 6 review pool once, on top of real Year 6 work', () => {
    const { seedY6FromY5, seedReviewPoolFromY5 } = mods.y5bridge;
    const today = '2026-09-07';

    // No import: nothing to seed from.
    const bare = shellStorage.defaultState();
    ok(!seedReviewPoolFromY5(bare, today), 'without a y5 slice there is no review pool to build');

    // Two weeks of Year 6 already on the device — seedY6FromY5 would refuse, this must not.
    const st = shellStorage.defaultState();
    shellStorage.importY5Backup(st, y5Real({ strong: 92, weak: 35 }));
    const y6 = st.maths.y6;
    y6.diagnosticDone = true;
    y6.completed.push('u01-pv10m', 'u01-round-neg', 'u02-addsub');
    for (const id of y6.completed) y6.mastery[id] = newMastery(80);
    y6.attempts.push({ d: '2026-09-01', t: 'u01-pv10m', tier: 1, ok: 1 });
    ok(!seedY6FromY5(st), 'the prior migration stays locked out by real practice');
    ok(seedReviewPoolFromY5(st, today), 'the review-pool migration is not');

    eq(y6.completed.length, 3 + 32, 'every Year 5 topic counts as completed for the scheduler');
    eq(completedY6(y6), 3, 'but the journey count still reads the three Year 6 topics');
    eq(y6.completed.slice(-3), ['u01-pv10m', 'u01-round-neg', 'u02-addsub'],
      'Year 5 ids go to the front: the variety lookback keeps seeing the real Year 6 history');
    eq(y6.mastery['u01-pv100k'].score, 92, 'a Year 5 score comes along as it was');
    eq(y6.mastery['u03-column'].score, 35);
    eq(y6.mastery['u17-volume'].score, 50, 'a topic the backup never scored starts neutral');
    for (const t of y5Topics) eq(y6.mastery[t.id].due, today, `${t.id} is due today`);
    eq(y6.mastery['u02-addsub'].score, 80, 'Year 6 mastery is untouched');
    ok(y6.y5ReviewSeeded, 'marked as migrated');
    ok(!seedReviewPoolFromY5(st, today), 'idempotent: it runs on every launch');
    eq(y6.completed.length, 35, 'and a second run adds nothing');

    // The scheduler now draws on the whole of Year 5 on a review-only day.
    const plan = planSession(y6, topicOrder, today, makeRng(4), journeyMeta, { allowNewTopic: false });
    eq(plan.kind, 'review');
    eq(plan.review.length, SESSION_ITEMS);
    const ids = new Set(plan.review.map((r) => r.topicId));
    eq(ids.size, 5, 'five topics on a review-only day');
    ok([...ids].some((id) => !isY6Topic(id)), 'and Year 5 topics are among them');
    for (const r of plan.review) ok(topicById(r.topicId)?.gen, `${r.topicId} resolves to a generator`);
  });

  test('y5-bridge: a device that already sat the old check still gets the Year 5 priors', () => {
    // The check it sat is the one we decided was worthless (Year 6 material
    // before any Year 6 lesson), so diagnosticDone must not lock the device out
    // of the better evidence. A half-finished check must not survive either:
    // the day card would offer "Continue" straight back into it.
    const { seedY6FromY5 } = mods.y5bridge;
    const st = shellStorage.defaultState();
    shellStorage.importY5Backup(st, y5Real());
    st.maths.y6.diagnosticDone = true;
    st.maths.y6.activeSession = { day: '2026-08-25', kind: 'diagnostic', phase: 'items', items: [], idx: 0 };

    ok(seedY6FromY5(st), 'the Year 5 scores still win');
    eq(st.maths.y6.activeSession, null, 'the pending warm-up check is dropped');
    ok(st.maths.y6.y5Seeded, 'and it is marked as migrated');
    ok(!seedY6FromY5(st), 'exactly once, however often the app launches');

    // A session that is NOT the warm-up check is left alone.
    const other = shellStorage.defaultState();
    shellStorage.importY5Backup(other, y5Real());
    const live = { day: '2026-08-25', kind: 'daily', phase: 'items', items: [], idx: 0 };
    other.maths.y6.activeSession = live;
    ok(seedY6FromY5(other));
    eq(other.maths.y6.activeSession, live, 'a real lesson in progress is none of our business');
  });

  test('y5-bridge: every implemented Year 6 strand can be reached from Year 5, or is knowingly new', () => {
    const { Y5_TO_Y6_STRAND } = mods.y5bridge;
    // Since B4 the Year 5 strands come from the topic modules themselves.
    const Y5_TOPIC_STRAND = Object.fromEntries(y5Topics.map((t) => [t.id, t.strand]));
    // Year 6 strands with no Year 5 ancestor start neutral ON PURPOSE. This
    // test exists so that adding 6B/6C topics forces a decision here rather
    // than silently seeding them with 50.
    const NEW_IN_Y6 = ['algebra', 'ratio', 'problem'];
    const reachable = new Set(Object.values(Y5_TO_Y6_STRAND).flat());
    for (const strand of new Set(topics.map((t) => t.strand))) {
      ok(reachable.has(strand) || NEW_IN_Y6.includes(strand),
        `Y6 strand "${strand}" is neither mapped from Year 5 nor listed as new`);
    }
    for (const y5strand of new Set(Object.values(Y5_TOPIC_STRAND))) {
      ok(Y5_TO_Y6_STRAND[y5strand], `Y5 strand "${y5strand}" has no Year 6 target`);
    }
  });

  test('y5-bridge: a backup of unknown topics leaves the warm-up check standing', () => {
    const { seedY6FromY5 } = mods.y5bridge;
    const st = shellStorage.defaultState();
    shellStorage.importY5Backup(st, JSON.stringify({
      app: 'powermath-trainer',
      state: {
        version: 1, settings: {}, mastery: { 'not-a-topic': { score: 80 } },
        stars: {}, completed: ['not-a-topic'], diagnosticDone: true,
        history: [], attempts: [], qaLog: [],
      },
    }));
    ok(!seedY6FromY5(st), 'nothing recognised means nothing learned');
    ok(!st.maths.y6.diagnosticDone, 'so the check is still owed');
  });

  test('session: a session generated by an older build is never resumed', () => {
    // A session is stored FINISHED — prompt text and rendered SVG — so a
    // content fix cannot reach one that already exists. On the device, two
    // faulty questions survived the fix, the deploy AND two restarts, because
    // the morning's session was still sitting in localStorage.
    const { isResumable } = mods.session;
    const { BUILD } = mods.build;
    const today = mods.engineStorage.dayKey();
    ok(isResumable({ day: today, phase: 'items', build: BUILD }), "today's session from this build resumes");
    ok(!isResumable({ day: today, phase: 'items', build: 'lernapp-v1' }), 'an older build does not');
    ok(!isResumable({ day: today, phase: 'items' }), 'nor one stamped before stamps existed');
    ok(!isResumable({ day: '2020-01-01', phase: 'items', build: BUILD }), 'nor one from another day');
    ok(!isResumable(null), 'and no session at all is not resumable');
  });

  test('scheduler: a maths day is ONE sitting of about eleven questions', () => {
    // Reported from the sofa: a short unit, then a separate review unit, and
    // every time an argument about whether the second one still counts. The
    // parts were sized independently — 7 + 4 on a topic day, 10 on a review
    // day, and 7 alone on the first day of the year, when nothing is due yet.
    const { seedY6FromY5 } = mods.y5bridge;
    const { completeTopic, finishSession } = mods.progress;
    const { dayPlan } = mods.rhythm;
    const st = shellStorage.defaultState();
    shellStorage.importY5Backup(st, y5Real());
    seedY6FromY5(st);
    const slice = st.maths.y6;

    const sizes = [];
    for (let i = 0; i < 14; i++) {
      const day = mods.engineStorage.addDays('2026-09-01', i);
      const rhythm = dayPlan(slice, day, slice.settings.newTopicEveryDays);
      const plan = planSession(slice, topicOrder, day, makeRng(seedFromString(day)), journeyMeta,
        { skip: [], allowNewTopic: rhythm.newTopic });
      const n = (plan.tiers?.length ?? 0) + plan.review.length;
      sizes.push({ day, n, kind: plan.kind });
      if (plan.newTopic) {
        completeTopic(slice, plan.newTopic, n - 1, plan.tiers.length, day);
        finishSession(slice, { kind: 'daily', topicId: plan.newTopic, total: n, correct: n - 1, minutes: 9 }, day);
      } else if (n) {
        finishSession(slice, { kind: 'review', topicId: null, total: n, correct: n - 1, minutes: 8 }, day);
      }
    }
    for (const s of sizes) {
      ok(s.n === SESSION_ITEMS, `${s.day} (${s.kind}) is ${s.n} questions, not ${SESSION_ITEMS}`);
    }
    // Including the very first day of the curriculum, which has nothing to
    // review yet and used to be the shortest of the lot.
    eq(sizes[0].n, SESSION_ITEMS, 'day one carries the whole sitting on the new topic alone');
  });

  test('number line: tick labels never overlap', () => {
    // Reported from the device: the numbers on the line could not be read. The
    // lesson's own line put eleven 46 px labels on a 28.8 px pitch. Measured
    // here for real (getComputedTextLength), not estimated, for every number
    // line the content actually builds.
    const { numberLine } = mods.vis;
    const lines = [
      ['pv10m lesson', numberLine(3000000, 4000000, [{ v: 3600000, label: '?' }], { step: 100000 })],
      ['pv10m question', numberLine(4000000, 5000000, [4300000], { step: 100000 })],
      ['negatives lesson', numberLine(-8, 4, [{ v: -6, label: '-6' }], { step: 1 })],
      ['negatives question', numberLine(-10, 10, [{ v: -3, label: '-3' }], { step: 1 })],
      ['fractions 0-1', numberLine(0, 1, [{ v: 0.75, label: '3/4' }], { step: 0.25 })],
      ['fractions halves', numberLine(0, 1, [{ v: 0.5, label: '?' }], { step: 0.5 })],
    ];
    const host = document.createElement('div');
    document.body.append(host);
    try {
      for (const [name, svgText] of lines) {
        host.innerHTML = svgText;
        const labels = [...host.querySelectorAll('text')]
          .filter((t) => t.getAttribute('font-size') === '11')
          .map((t) => ({ s: t.textContent, x: Number(t.getAttribute('x')), w: t.getComputedTextLength() }))
          .sort((a, b) => a.x - b.x);
        ok(labels.length >= 2, `${name}: a line with fewer than two labels is not a number line`);
        for (let i = 1; i < labels.length; i++) {
          const prevRight = labels[i - 1].x + labels[i - 1].w / 2;   // text-anchor is middle
          const left = labels[i].x - labels[i].w / 2;
          ok(left >= prevRight, `${name}: "${labels[i - 1].s}" and "${labels[i].s}" overlap by ${Math.round(prevRight - left)}px`);
        }
        ok(host.querySelectorAll('line').length > labels.length,
          `${name}: thinning the labels must not thin the ticks`);
      }
    } finally {
      host.remove();
    }
  });

  test('place value: a digit named by its face value occurs exactly once', () => {
    // Reported from the device: "What is the value of the digit 5 in 556,539?"
    // — three fives, so the question has three answers. This sweeps every
    // generator, not just the two that had the bug, so a future one cannot
    // reintroduce it.
    const check = (prompt) => {
      const plain = String(prompt).replace(/<[^>]*>/g, '');
      const m = /digit\s+(\d)\s+in\s+([\d,]+)/.exec(plain);
      if (!m) return;
      const hits = m[2].split('').filter((c) => c === m[1]).length;
      ok(hits === 1, `names the digit ${m[1]}, which appears ${hits} times: ${plain}`);
    };
    for (const seed of ['a', 'b', 'c', 'd', 'e', 'f']) {
      for (const q of mods.content.diagnosticItems(makeRng(seedFromString(seed)))) check(q.prompt);
      for (const t of topics) {
        for (const tier of [1, 2, 3]) {
          for (let i = 0; i < 6; i++) check(t.gen(makeRng(seedFromString(`${seed}|${t.id}|${tier}|${i}`)), tier).prompt);
        }
      }
    }
  });

  test('diagnostic: every item stays Year 5 revision', () => {
    // The check runs before a single Year 6 lesson. Three items used to ask
    // Year 6 material (7-digit place value, BIDMAS, reflection into the
    // negative quadrants); these are the guards that keep them out.
    for (const seed of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
      for (const q of mods.content.diagnosticItems(makeRng(seedFromString(seed)))) {
        const texts = [q.prompt, ...(q.options ?? []).map(String)];
        for (const t of texts) {
          ok(!/\d{1,3}(?:,\d{3}){2,}/.test(t), `a 7-digit number is Year 6: ${t}`);
          ok(!/\(\s*-/.test(t), `negative coordinates are Year 6: ${t}`);
        }
        ok(!(/\+/.test(q.prompt) && /×/.test(q.prompt)),
          `mixing + and × in one expression is BIDMAS, which is Year 6: ${q.prompt}`);
      }
    }
  });

  // ------------------------------------------------- server keys and speech

  test('endpoint: readHealth tells "no server" from "signed out" from "ready"', () => {
    const { readHealth } = mods.endpoint;
    eq(readHealth({ ok: true, status: 200, contentType: 'application/json', body: { ok: true, anthropic: true, gemini: true } }),
      { anthropic: true, gemini: true, reason: 'ok' });
    eq(readHealth({ ok: true, status: 200, contentType: 'application/json', body: { ok: true, anthropic: true, gemini: false } }),
      { anthropic: true, gemini: false, reason: 'ok' });
    // GitHub Pages: its 404 page.
    eq(readHealth({ ok: false, status: 404, contentType: 'text/html' }).reason, 'no-server');
    // Cloudflare Access once the month is up: the login page, not our JSON.
    eq(readHealth({ ok: true, status: 200, contentType: 'text/html', redirected: true }).reason, 'signed-out');
  });

  await atest('endpoint: the server key alone makes the AI features available', async () => {
    const { probeServer, resetProxyProbe, aiReady, sttReady, usingProxy } = mods.endpoint;
    const real = window.fetch;
    try {
      resetProxyProbe();
      ok(aiReady(''), 'before the probe answers, features are offered rather than hidden');
      window.fetch = async () => new Response(JSON.stringify({ ok: true, anthropic: true, gemini: true }),
        { status: 200, headers: { 'content-type': 'application/json' } });
      await probeServer();
      ok(aiReady(''), 'no key on this device, and the tutor is still available');
      ok(sttReady(), 'speech too');
      ok(usingProxy(), 'and postMessages can skip its own probe');

      resetProxyProbe();
      window.fetch = async () => new Response('<!doctype html>', { status: 404, headers: { 'content-type': 'text/html' } });
      await probeServer();
      ok(!aiReady(''), 'a static host with no key really does mean no tutor');
      ok(aiReady('sk-typed-here'), 'unless a key was typed on the device');
      ok(!sttReady(), 'speech has no device-key fallback at all');
    } finally {
      window.fetch = real;
      resetProxyProbe();
    }
  });

  test('stt: the WAV the recorder hands to Gemini is well formed', () => {
    const { float32ToInt16, pcmToWavBlob, parseTranscript, sttPrompt } = mods.enStt;

    const pcm = float32ToInt16(new Float32Array([0, 1, -1, 0.5]));
    eq(pcm.length, 8, 'two bytes per sample');
    const v = new DataView(pcm.buffer);
    eq(v.getInt16(0, true), 0);
    eq(v.getInt16(2, true), 32767, 'full scale up');
    eq(v.getInt16(4, true), -32768, 'full scale down');

    const blob = pcmToWavBlob(pcm, 16000);
    eq(blob.type, 'audio/wav');
    eq(blob.size, 44 + pcm.byteLength, 'a 44-byte header and nothing else');

    eq(parseTranscript({ candidates: [{ content: { parts: [{ text: 'the door ' }, { text: 'was open' }] } }] }),
      'the door was open', 'parts are joined, not just the first one');
    eq(parseTranscript({}), '', 'a refusal or an empty answer is an empty string, never a crash');

    const prompt = sttPrompt();
    ok(/do not correct grammar/i.test(prompt) && /word for word/i.test(prompt),
      'the prompt must forbid tidying up his English, which is the whole point');
  });

  report();
}

function report() {
  const out = document.getElementById('out');
  const passed = results.filter((r) => r.ok).length;
  const failed = results.length - passed;
  document.getElementById('summary').textContent =
    `TESTS: ${passed} passed, ${failed} failed (${results.length} total)`;
  document.getElementById('summary').className = failed ? 'fail' : 'pass';
  for (const r of results) {
    const div = document.createElement('div');
    div.className = r.ok ? 'pass' : 'fail';
    div.textContent = (r.ok ? '✓ ' : '✗ ') + r.name + (r.err ? ' — ' + r.err : '');
    out.append(div);
  }
  console.log(`TESTS: ${passed} passed, ${failed} failed`);
  results.filter((r) => !r.ok).forEach((r) => console.error('FAIL:', r.name, r.err));
  window.__testResults = { passed, failed, results };
}

run();
