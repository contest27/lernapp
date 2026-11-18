// The Power Maths check-in (phase B8) and the Today card that follows it.
//
// "What did you do in Power Maths today?" — answered by recognising, not by
// remembering: the lesson the class most likely did is shown with a sample
// question rendered from its own generator, because a child who has forgotten
// the title usually still knows the TYPE of task. "Something else" opens the
// whole book, unit by unit, with a sample per lesson.
//
// The logic lives in maths/school.js; this file is screens only.

import { h, store, go, cur, toast, registerScreen } from '../shell/core.js';
import { headerBar, progressBar } from './components.js';
import { dayKey, addDays } from '../engine/storage.js';
import { makeRng, seedFromString } from '../engine/rng.js';
import {
  UNITS, lessonById, lessonsOfUnit, lessonLabel, previewOf, unitById, LESSONS, nextLesson,
} from '../maths/content/lessons.js';
import {
  applyCheckin, checkinDue, predictedLesson, isSchoolDay, planPreview, lessonsDone,
  activeTest, setTest, clearTest, testLessons, testUnitDefault, weekday,
} from '../maths/school.js';
import {
  startOrResumePreview, startOrResumeTest, openRound, isPreviewRound, isTestRound,
} from './session.js';
import { attachGloss } from './gloss.js';

// A recognisable example of a lesson's task type — always the same one for the
// same lesson (fixed seed), easy tier, not answerable here.
function sampleEl(lessonId) {
  const p = previewOf(lessonId);
  if (!p) {
    return h('p', { class: 'muted ci-nosample' }, 'This lesson is not in the app yet.');
  }
  const q = p.gen(makeRng(seedFromString(lessonId + '|sample')), 1);
  const prompt = h('div', { class: 'prompt', html: q.prompt });
  attachGloss(prompt, { topicId: p.topic.id });
  const box = h('div', { class: 'ci-sample' }, h('p', { class: 'ci-sample-head' }, 'It looked something like this:'), prompt);
  if (q.svg) box.append(h('div', { class: 'vis', html: q.svg }));
  if (q.kind === 'mc') {
    box.append(h('div', { class: 'ci-opts' }, q.options.map((o) => h('span', { class: 'ci-opt', html: String(o) }))));
  }
  return box;
}

function lessonHeading(id) {
  const l = lessonById(id);
  return h('div', { class: 'ci-lesson' },
    h('span', { class: 'ci-label' }, lessonLabel(id)),
    h('span', { class: 'ci-title' }, l.title));
}

function finish(params, lesson, finished, note = null) {
  const slice = cur();
  const today = dayKey();
  applyCheckin(slice, today, { lesson, finished, note });
  // A round built before this check-in prepared the wrong lesson — in the slot
  // or parked behind a test-practice round.
  const s = slice.activeSession;
  if (s && s.kind === 'preview' && s.phase !== 'summary') slice.activeSession = null;
  if (slice.parkedSession?.kind === 'preview') slice.parkedSession = null;
  store.save();
  const next = predictedLesson(slice);
  toast(next ? `Got it! Next up: ${lessonLabel(next.id)} ${next.title}` : 'Got it!', 2600);
  go(params?.parent ? 'parent' : 'today');
}

// ------------------------------------------------------------------ screen

registerScreen('checkin', (params) => {
  const p = params ?? {};
  const slice = cur();
  // A second check-in on the same day REPLACES the first (school.js), so the
  // screen starts from where the class was before today: "last time" and the
  // prediction must not count today's answer, or "change" would offer the
  // lesson after the one being corrected.
  const todays = slice.school.log.find((e) => e.day === dayKey());
  const pos = todays ? todays.before : slice.school.pos;
  const predicted = pos ? nextLesson(pos) : null;
  let step = p.step ?? 'pick';
  if (step === 'pick' && !(pos && predicted)) step = 'browse'; // first run, or the book is finished

  const wrap = h('div', { class: 'screen' });
  wrap.append(headerBar(p.parent ? 'Set the class position' : 'Power Maths check-in', {
    onBack: () => go(p.parent ? 'parent' : 'today'),
  }));
  const card = h('div', { class: 'card checkin-card' });
  wrap.append(card);

  if (step === 'finished') {
    card.append(lessonHeading(p.lessonId),
      h('h2', {}, 'Did you finish those pages?'),
      h('p', { class: 'muted' }, 'It is fine if not — then we practise a bit of it first.'),
      h('div', { class: 'ci-buttons' },
        h('button', { class: 'btn primary wide big', onclick: () => finish(p, p.lessonId, true) }, '✅ Yes, all done'),
        h('button', { class: 'btn subtle wide big', onclick: () => finish(p, p.lessonId, false) }, '⏳ Not quite')),
      h('button', { class: 'btn subtle', onclick: () => go('checkin', { ...p, step: 'pick' }) }, '‹ Back'));
    return wrap;
  }

  if (step === 'pick') {
    const today = dayKey();
    if (todays) {
      card.append(h('p', { class: 'muted' }, 'Today you said: ',
        h('b', {}, todays.lesson ? `${lessonLabel(todays.lesson)} ${lessonById(todays.lesson).title}` : 'no new lesson'),
        ' — answer again to change it.'));
    }
    card.append(
      h('p', { class: 'muted' }, todays ? 'Before that: ' : 'Last time: ', h('b', {}, `${lessonLabel(pos)} ${lessonById(pos).title}`)),
      h('h2', {}, isSchoolDay(today) ? 'What did you do in Power Maths today?' : 'What did you do in your last Power Maths lesson?'),
    );
    const cand = h('div', { class: 'ci-candidate' },
      h('p', { class: 'ci-sub' }, 'Probably the next one:'),
      lessonHeading(predicted.id),
      sampleEl(predicted.id),
      h('button', {
        class: 'btn primary wide big',
        onclick: () => go('checkin', { ...p, step: 'finished', lessonId: predicted.id }),
      }, '✅ Yes, we did this one'));
    // On (or after) an announced test day, the test is the likely answer.
    const test = slice.school.test;
    const hadTest = test && test.day <= today
      ? h('button', { class: 'btn primary wide', onclick: () => finish(p, null, null, 'test') }, `📝 We had the Unit ${test.unit} test today`)
      : null;
    card.append(cand,
      h('div', { class: 'ci-buttons' },
        hadTest,
        h('button', { class: 'btn subtle wide', onclick: () => finish(p, null, null) }, '⏸ No new lesson today'),
        h('button', {
          class: 'btn subtle wide',
          onclick: () => go('checkin', { ...p, step: 'browse', unit: predicted.unit }),
        }, '🔎 Something else')));
    return wrap;
  }

  // ---- browse: the whole book, unit by unit
  const unit = p.unit ?? (predicted?.unit ?? lessonById(pos)?.unit ?? 1);
  const u = unitById(unit);
  card.append(h('h2', {}, pos ? 'Which lesson was it?' : 'Which Power Maths lesson did your class do last?'));
  if (!pos) {
    card.append(h('p', { class: 'muted' },
      'Pick the unit first, then the lesson. The title is at the top of the page in your practice book.'));
  }
  const chips = h('div', { class: 'ci-units' });
  for (const book of ['6A', '6B', '6C']) {
    const row = h('div', { class: 'ci-unitrow' }, h('span', { class: 'ci-book' }, book));
    for (const x of UNITS.filter((v) => v.book === book)) {
      row.append(h('button', {
        class: 'chip ci-unit' + (x.unit === unit ? ' on' : ''),
        onclick: () => go('checkin', { ...p, step: 'browse', unit: x.unit }),
      }, `U${x.unit}`));
    }
    chips.append(row);
  }
  card.append(chips, h('h3', { class: 'ci-unit-title' }, `Unit ${u.unit} · ${u.title}`));

  // Rows open IN PLACE (no re-render): go() scrolls to the top, which threw a
  // lesson further down the list out of sight the moment he tapped it.
  const list = h('div', { class: 'ci-list' });
  const close = (row) => { row.classList.remove('open'); row.querySelector('.ci-detail')?.remove(); };
  for (const l of lessonsOfUnit(unit)) {
    const marks = [];
    if (l.id === pos) marks.push(h('span', { class: 'ci-mark' }, 'last time'));
    if (predicted && l.id === predicted.id) marks.push(h('span', { class: 'ci-mark next' }, 'next?'));
    const row = h('div', { class: 'ci-row' });
    const openRow = () => {
      for (const other of list.querySelectorAll('.ci-row.open')) close(other);
      row.classList.add('open');
      row.append(h('div', { class: 'ci-detail' }, sampleEl(l.id), h('button', {
        class: 'btn primary wide',
        onclick: () => (p.parent ? finish(p, l.id, null) : go('checkin', { ...p, step: 'finished', lessonId: l.id })),
      }, '✅ This one')));
      row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    };
    row.append(h('button', {
      class: 'ci-rowbtn',
      onclick: () => (row.classList.contains('open') ? close(row) : openRow()),
    }, h('span', { class: 'ci-n' }, `L${l.n}`), h('span', { class: 'ci-t' }, l.title), ...marks));
    list.append(row);
  }
  card.append(list);
  if (pos && !p.parent) {
    card.append(h('button', { class: 'btn subtle wide', onclick: () => finish(p, null, null) }, '⏸ No new lesson today'));
  }
  return wrap;
});

// ------------------------------------------------------------------ Today card

// The class-tracker version of the Today card: check in first, then the round
// for tomorrow's lesson. Returns the card element; today.js places it.
export function schoolTodayCard(slice, today) {
  const card = h('div', { class: 'card today-card' });
  const pos = slice.school.pos;

  if (!pos) {
    card.append(h('h2', {}, 'Where is your class? 📒'),
      h('p', {}, 'Tell me which Power Maths lesson your class did last. Then I can get you ready for the next one.'),
      h('button', { class: 'btn primary wide big start', onclick: () => go('checkin') }, 'Choose the lesson ▶'));
    return card;
  }

  // A unit test ahead (B11). On the test day itself the practice comes first —
  // he may open the app before school — and the check-in waits behind it.
  const test = activeTest(slice, today);
  if (test && (test.day === today || !checkinDue(slice, today))) {
    return testTodayCard(slice, today, test, card);
  }

  if (checkinDue(slice, today)) {
    card.append(h('h2', {}, 'Power Maths check-in 📒'),
      h('p', {}, isSchoolDay(today) ? 'What did you do in maths today?' : 'What did you do in your last maths lesson?'),
      h('p', { class: 'muted' }, `Last time: ${lessonLabel(pos)} ${lessonById(pos).title}`),
      h('button', { class: 'btn primary wide big start', onclick: () => go('checkin') }, 'Check in ▶'),
      h('button', { class: 'ci-change', onclick: () => go('testdate') },
        test ? `📝 Unit ${test.unit} test ${whenLabel(test.day, today)} — change` : '📝 Test coming up?'));
    return card;
  }

  const inProgress = !!openRound(slice, isPreviewRound); // in the slot or parked
  const doneToday = slice.history.some((e) => e.day === today && e.kind === 'preview');
  const plan = planPreview(slice, today, makeRng(seedFromString(today)));
  const target = plan.target ? lessonById(plan.target) : null;

  if (inProgress) {
    card.append(h('h2', {}, 'Warm-up in progress'),
      h('p', {}, 'You were part-way through. Pick up where you left off!'));
  } else if (target && plan.hasPreview) {
    const notes = [h('p', { class: 'muted' }, 'A quick look, 4 questions like tomorrow\'s, 2 from earlier topics.')];
    if (plan.catchUp) notes.unshift(h('p', { class: 'muted' }, `📒 First 2 from today's pages (${lessonById(plan.catchUp).title}).`));
    card.append(h('h2', {}, 'Tomorrow in class 🔭'),
      h('p', { class: 'topic-name' }, `${lessonLabel(target.id)} · ${target.title}`), ...notes);
  } else if (target) {
    card.append(h('h2', {}, 'Tomorrow in class 🔭'),
      h('p', { class: 'topic-name' }, `${lessonLabel(target.id)} · ${target.title}`),
      h('p', { class: 'muted' }, 'This lesson is not in the app yet — here is a review round instead.'));
  } else {
    card.append(h('h2', {}, 'Book finished! 🏁'),
      h('p', {}, 'Your class has done every lesson of Year 6. Here is a review round.'));
  }

  if (plan.items.length || inProgress) {
    card.append(h('button', { class: 'btn primary wide big start', onclick: startOrResumePreview },
      inProgress ? 'Continue ▶' : doneToday ? 'Practise again ▶' : 'Start ▶'));
  }
  if (doneToday && !inProgress) {
    card.append(h('p', { class: 'muted center-t' }, '✅ Ready for tomorrow — extra practice is always welcome!'));
  }
  const last = slice.school.log.at(-1);
  const lastLine = last && last.day === today && !last.lesson
    ? `${last.note === 'test' ? 'Unit test today' : 'No new lesson today'} · last: ${lessonLabel(pos)}`
    : `Last lesson: ${lessonLabel(pos)} ${lessonById(pos).title}`;
  card.append(h('button', { class: 'ci-change', onclick: () => go('checkin', { step: 'pick' }) },
    `✏️ ${lastLine} — change`),
  h('button', { class: 'ci-change', onclick: () => go('testdate') }, '📝 Test coming up?'));
  return card;
}

// "on Thursday", "tomorrow", "today" — how the card names the test day.
function whenLabel(day, today) {
  if (day === today) return 'today';
  if (day === addDays(today, 1)) return 'tomorrow';
  return 'on ' + WEEKDAYS[weekday(day)];
}
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// One of the two equal choices on the test-week card: icon, what it is, and a
// line saying how far he got today.
function choiceEl({ icon, title, sub, status, onclick }) {
  return h('button', { class: 'choice', onclick },
    h('span', { class: 'choice-icon' }, icon),
    h('b', { class: 'choice-title' }, title),
    h('span', { class: 'choice-sub' }, sub),
    status ? h('span', { class: 'choice-status' }, status) : null);
}

// The Today card while a unit test lies ahead. Two EQUAL choices — practise
// for the test, or get ready for tomorrow's lesson — and nothing starts until
// he picks one (Sebastian, 2026-11-18: it must not slide him into the test).
function testTodayCard(slice, today, test, card) {
  const testOpen = openRound(slice, isTestRound(test.unit));
  const testsToday = slice.history.filter((e) => e.day === today && e.kind === 'test');
  const lastWeak = testsToday.at(-1)?.weak ?? [];
  const n = testLessons(test.unit).length;
  const plan = planPreview(slice, today, makeRng(seedFromString(today)));
  const previewOpen = openRound(slice, isPreviewRound);
  const previewDone = slice.history.some((e) => e.day === today && e.kind === 'preview');

  card.append(h('h2', {}, `📝 Unit ${test.unit} test ${whenLabel(test.day, today)}`),
    h('p', { class: 'muted' }, 'What would you like to do?'));

  const choices = h('div', { class: 'choices' });
  choices.append(choiceEl({
    icon: '📝',
    title: `Practise for the Unit ${test.unit} test`,
    sub: `${n} questions, one from every lesson of ${unitById(test.unit).title}`,
    status: testOpen ? 'Part-way through — continue ▶'
      : testsToday.length ? (lastWeak.length ? '✅ Done today — again ▶' : '✅ Done today, all right first time — again ▶')
        : 'Start ▶',
    onclick: () => startOrResumeTest(test.unit),
  }));
  if (plan.hasPreview) {
    const t = lessonById(plan.target);
    choices.append(choiceEl({
      icon: '🔭',
      title: 'Get ready for tomorrow',
      sub: `${lessonLabel(t.id)} · ${t.title}`,
      status: previewOpen ? 'Part-way through — continue ▶' : previewDone ? '✅ Done today — again ▶' : 'Start ▶',
      onclick: startOrResumePreview,
    }));
  }
  card.append(choices);

  if (!testOpen && lastWeak.length) {
    card.append(h('button', { class: 'btn subtle wide', onclick: () => startOrResumeTest(test.unit, lastWeak) },
      `📝 Practise the tricky ones from the test practice (${lastWeak.length}) ▶`));
  }
  if (checkinDue(slice, today)) {
    card.append(h('button', { class: 'btn subtle wide', onclick: () => go('checkin') }, '📒 Check in: what did you do in maths today?'));
  }
  card.append(h('button', { class: 'ci-change', onclick: () => go('testdate') }, '📝 Change the test day'));
  return card;
}

// ------------------------------------------------------------------ test day

// "When is the test?" — the unit (preset to the class's current one) and the
// next school days by name. Reached from the Today card and the parent corner.
registerScreen('testdate', (params) => {
  const p = params ?? {};
  const slice = cur();
  const today = dayKey();
  const back = () => go(p.parent ? 'parent' : 'today');
  const current = slice.school.test;
  const def = testUnitDefault(slice) ?? 1;
  const units = [def, def - 1].filter((u) => u >= 1 && testLessons(u).length);
  const unit = p.unit ?? current?.unit ?? units[0] ?? def;

  const wrap = h('div', { class: 'screen' });
  wrap.append(headerBar('Unit test', { onBack: back }));
  const card = h('div', { class: 'card checkin-card' });
  wrap.append(card);

  card.append(h('h2', {}, 'Which unit is the test about?'));
  const chips = h('div', { class: 'ci-unitrow' });
  for (const u of units) {
    chips.append(h('button', {
      class: 'chip ci-unit' + (u === unit ? ' on' : ''),
      onclick: () => go('testdate', { ...p, unit: u }),
    }, `Unit ${u} · ${unitById(u).title}`));
  }
  card.append(chips);

  card.append(h('h2', {}, 'When is the test?'));
  const days = [];
  for (let d = today; days.length < 6; d = addDays(d, 1)) if (isSchoolDay(d)) days.push(d);
  const list = h('div', { class: 'ci-buttons' });
  for (const d of days) {
    const [, m, dd] = d.split('-').map(Number);
    const label = `${d === today ? 'Today' : d === addDays(today, 1) ? 'Tomorrow' : WEEKDAYS[weekday(d)]} · ${dd} ${MONTHS[m - 1]}`;
    list.append(h('button', {
      class: 'btn wide ' + (current && current.day === d && current.unit === unit ? 'primary' : 'subtle'),
      onclick: () => {
        setTest(slice, unit, d, today);
        store.save();
        toast(`Unit ${unit} test ${whenLabel(d, today)} — test practice is ready!`, 2600);
        back();
      },
    }, label));
  }
  card.append(list);
  if (current) {
    card.append(h('button', {
      class: 'btn subtle',
      onclick: () => { clearTest(slice); store.save(); toast('Test removed'); back(); },
    }, 'Remove the test'));
  }
  return wrap;
});
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// The progress line under the Today card: where the class is in the book.
export function schoolProgressCard(slice) {
  const done = lessonsDone(slice);
  const pos = slice.school.pos;
  const u = pos ? unitById(lessonById(pos).unit) : null;
  return h('div', { class: 'card slim' },
    h('div', { class: 'row spread' }, h('b', {}, 'Power Maths Year 6'),
      h('span', {}, u ? `Book ${u.book} · Unit ${u.unit} of ${UNITS.length}` : 'not started')),
    progressBar(done, LESSONS.length),
    h('p', { class: 'muted' }, `${done} of ${LESSONS.length} lessons done in class.`));
}
