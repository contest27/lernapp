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
      gen: await import('../js/maths/content/gen.js'),
      glossary: await import('../js/maths/content/glossary.js'),
      shellStorage: await import('../js/shell/storage.js'),
      lesson: await import('../js/ui/lesson.js'),
      gloss: await import('../js/ui/gloss.js'),
      focus: await import('../js/ui/focus.js'),
      tutor: await import('../js/qa/tutor.js'),
      mapScene: await import('../js/ui/map-scene.js'),
    };
  } catch (e) {
    results.push({ name: 'MODULE IMPORTS', ok: false, err: String(e) });
    report();
    return;
  }

  const { makeRng, seedFromString, ri, shuffle } = mods.rng;
  const { addDays, daysBetween } = mods.engineStorage;
  const { newMastery, updateMastery, bandOf, scheduleAfterSession, diagnosticScore } = mods.mastery;
  const { planSession, nextNewTopic, dueReviewTopics, pickReviewTopics, NEW_TOPIC_TIERS, pacing } = mods.scheduler;
  const { checkAnswer, parseNumber, answerText, gcd } = mods.check;
  const { finishSession } = mods.progress;
  const { topics, topicOrder, topicById, journeyMeta } = mods.content;
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
    for (const t of topics) {
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
    for (const t of topics) {
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

  // ==================== D. HUB STORAGE (fresh — pins the shell's design) ====================

  test('storage: defaultState shape', () => {
    const st = shellStorage.defaultState();
    eq(st.version, 1);
    eq(st.shell.streak, { count: 0, lastDay: null });
    eq(st.maths.active, 'y6');
    eq(st.english, null);
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
    ok(swText.includes("'lernapp-v5'"), 'CACHE_VERSION was not bumped for the parent-corner release');
    for (const p of ["'./js/maths/content/y6a.js'", "'./js/maths/content/y6a-u3u6.js'",
      "'./js/maths/content/y6a-frac.js'", "'./js/maths/content/glossary.js'",
      "'./js/maths/content/diagnostic.js'", "'./js/ui/session.js'", "'./js/ui/today.js'",
      "'./js/ui/lesson.js'", "'./js/ui/gloss.js'", "'./js/ui/explain.js'", "'./js/ui/buddy.js'",
      "'./js/qa/tutor.js'", "'./js/tts.js'", "'./js/ui/map.js'", "'./js/ui/map-scene.js'",
      "'./js/ui/svg.js'"]) {
      ok(swText.includes(p), 'sw.js ASSETS missing ' + p);
    }
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
    st.shell.name = 'Severin';
    const backup = shellStorage.exportJSON(st);
    ok(!backup.includes('sk-on-this-device'), 'the export strips the key');
    const imported = shellStorage.parseImport(backup);
    eq(imported.shell.apiKey, '', 'the imported state has no key');
    imported.shell.apiKey = st.shell.apiKey; // what parent.js does on restore
    eq(imported.shell.apiKey, 'sk-on-this-device');
    eq(imported.shell.name, 'Severin', 'the rest of the shell round-trips');
  });

  test('tutor: prompts speak to Year 6 and the gloss prompt still bans solving', () => {
    const sys = mods.tutor.buddySystemPrompt({ topicName: 'Fractions' });
    ok(/Year 6/.test(sys), 'buddy prompt updated for Y6');
    const g = mods.tutor.glossSystemPrompt();
    ok(/Rechne NIEMALS/i.test(g) && /NUR dieses eine Wort/i.test(g), 'gloss prompt unchanged in spirit');
    ok(!mods.tutor.translateSystemPrompt && !mods.tutor.wordHelpSystemPrompt, 'no full-text German paths');
  });

  report();

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
