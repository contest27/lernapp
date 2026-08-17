import { h, store, go, cur, logQa, PRAISE, ENCOURAGE, registerScreen } from '../shell/core.js';
import {
  headerBar, speakerButton, numberPad, fractionPad, orderPicker,
  progressBar, starRow, confettiBurst,
} from './components.js';
import { planSession, NEW_TOPIC_TIERS, pacing, nextNewTopic } from '../engine/scheduler.js';
import { recordAttempt, topicsDoneToday } from '../engine/progress.js';
import { checkAnswer, answerText } from '../engine/check.js';
import { dayKey } from '../engine/storage.js';
import { makeRng, seedFromString, pick } from '../engine/rng.js';
import { topicOrder, topicById, diagnosticItems, journeyMeta } from '../maths/content/index.js';
import { buildFocusSession, applySessionEnd } from './focus.js';
import { createChat } from './chat.js';
import {
  lessonSteps, stepIndex, advanceStep, backStep, isLastStep, canPractise, markCheckedIn,
} from './lesson.js';
import { askTutor } from '../qa/tutor.js';
import { segmentEl, exampleEl, explanationSheet } from './explain.js';
import { attachGloss } from './gloss.js';
import { dayPlan, activeDeferrals } from '../shell/rhythm.js';
import * as tts from '../tts.js';

// ---------------------------------------------------------------- session build

export function buildSession() {
  const today = dayKey();
  const rng = makeRng(seedFromString(today + '|' + cur().completed.length));
  const slice = cur();
  const rhythm = dayPlan(slice, today, slice.settings.newTopicEveryDays);
  const plan = planSession(slice, topicOrder, today, rng, journeyMeta, {
    skip: activeDeferrals(slice, today),
    allowNewTopic: rhythm.newTopic,
  });
  const items = [];
  const seen = [];

  const gen = (topic, tier) => {
    let q = topic.gen(rng, tier);
    for (let i = 0; i < 4 && seen.includes(q.prompt); i++) q = topic.gen(rng, tier);
    seen.push(q.prompt);
    if (seen.length > 6) seen.shift();
    return q;
  };

  if (plan.kind === 'diagnostic') {
    for (const q of diagnosticItems(rng)) items.push({ q, topicId: null, strand: q.strand, part: 'diagnostic' });
  } else {
    if (plan.newTopic) {
      const t = topicById(plan.newTopic);
      for (const tier of NEW_TOPIC_TIERS) items.push({ q: gen(t, tier), topicId: t.id, part: 'practice' });
    }
    for (const r of plan.review) {
      items.push({ q: gen(topicById(r.topicId), r.tier), topicId: r.topicId, part: 'review' });
    }
  }
  return {
    day: today,
    kind: plan.kind,
    newTopic: plan.newTopic ?? null,
    phase: plan.kind === 'daily' && plan.newTopic ? 'explain' : 'items',
    items, idx: 0,
    results: [],
    diag: {},
    startedAt: Date.now(),
    segIdx: 0,
  };
}

export function startOrResume() {
  const today = dayKey();
  const s = cur().activeSession;
  if (s && s.day === today && s.phase !== 'done') {
    go('session');
    return;
  }
  cur().activeSession = buildSession();
  store.save();
  go('session');
}

// Launch a one-topic practice from the map. Lives in its own state slot so a
// half-finished daily lesson in activeSession is never disturbed.
export function startFocusSession(topicId, mode, origin = 'map') {
  const today = dayKey();
  const rng = makeRng(seedFromString(today + '|focus|' + topicId + '|' + Date.now()));
  cur().focusSession = buildFocusSession(cur(), topicId, mode, today, rng, origin);
  store.save();
  go('session');
}

// The focus slot takes precedence: while a map practice runs, the daily lesson
// waits untouched in activeSession.
function sess() { return cur().focusSession ?? cur().activeSession; }

function persist() { store.save(); }

// Leave a session without finishing it. Focus practice is discarded (its
// per-item attempts were already recorded live); the daily lesson stays
// resumable, so it is only navigated away from.
function exitSession(s) {
  tts.stop();
  if (s.focus) { cur().focusSession = null; store.save(); }
  go(s.origin ?? 'today');
}

// ---------------------------------------------------------------- screen

registerScreen('session', () => {
  const s = sess();
  if (!s) { go('today'); return h('div'); }
  if (s.phase === 'explain') return explainView(s);
  if (s.phase === 'summary') return summaryView(s);
  return itemView(s);
});

// ------------------------------------------------------------- explanation view

// The lesson is walked one part at a time and practice stays locked until the
// check-in at the end is answered — a new topic can no longer be skipped with a
// single tap. The step position lives on the session (`segIdx`), so closing the
// tab mid-lesson resumes in the right place.
function explainView(s) {
  const topic = topicById(s.newTopic);
  const steps = lessonSteps(topic);
  const idx = stepIndex(s, topic);
  const step = steps[idx];
  const wrap = h('div', { class: 'screen' });
  wrap.append(headerBar('New topic', { onBack: () => exitSession(s) }));

  const card = h('div', { class: 'card lesson' });
  card.append(h('h1', { class: 'lesson-title' }, topic.title));
  card.append(stepProgress(idx, steps.length));

  if (step.kind === 'part') {
    for (const i of step.segs) card.append(segmentEl(topic.explanation.segments[i], topic));
    if (step.example) card.append(exampleEl(topic));
  } else {
    card.append(checkInEl(s, topic));
    card.append(qaBox(topic)); // the offline FAQ chips belong to the "any questions?" moment
  }
  wrap.append(card);

  const goStep = (move) => { tts.stop(); move(); persist(); go('session'); };
  const backBtn = h('button', {
    class: 'btn subtle', disabled: idx === 0, onclick: () => goStep(() => backStep(s, topic)),
  }, '‹ Back');

  let rightBtn = null;
  if (canPractise(s)) {
    rightBtn = h('button', {
      class: 'btn primary big',
      onclick: () => { tts.stop(); s.phase = 'items'; persist(); go('session'); },
    }, "Let's practise! →");
  } else if (!isLastStep(s, topic)) {
    rightBtn = h('button', {
      class: 'btn primary big', onclick: () => goStep(() => advanceStep(s, topic)),
    }, 'Next ›');
  }
  wrap.append(h('div', { class: 'stickybar steprow' }, backBtn, rightBtn));
  return wrap;
}

function stepProgress(idx, total) {
  const dots = h('div', { class: 'step-dots' });
  for (let i = 0; i < total; i++) dots.append(h('i', { class: i <= idx ? 'on' : '' }));
  return h('div', { class: 'step-head' },
    h('p', { class: 'lesson-sub' }, `Part ${idx + 1} of ${total}`), dots);
}

// "Did you understand?" — the moment the child's weaker English is explicitly
// checked. BOTH answers unlock practice: admitting that the words were hard
// must never lock him out. Neither answer offers German prose any more; the
// second one points him at the two things that do help — tapping a word, and
// the simpler English rephrasing on each part.
function checkInEl(s, topic) {
  const box = h('div', { class: 'checkin' });
  const out = h('div', { class: 'de-out' });
  const unlock = () => { markCheckedIn(s); persist(); };
  const gotIt = h('button', {
    class: 'btn primary wide big',
    onclick: () => { unlock(); go('session'); },
  }, "👍 I've got it");
  const trickyBtn = h('button', {
    class: 'btn subtle wide',
    onclick: () => {
      unlock();
      out.replaceChildren(h('div', { class: 'bubble tutor de-bubble' },
        h('p', {}, 'Kein Problem! Tippe im Text auf jedes Wort, das du nicht kennst — '
          + 'ich sage dir sofort, was es heißt.'),
        h('p', {}, 'Und mit „✨ Say it differently" erkläre ich denselben Satz noch einmal '
          + 'mit einfacheren englischen Wörtern.'),
        h('p', {}, 'Beim Üben kannst du jederzeit auf „📖 Show the explanation again" tippen.')));
      gotIt.textContent = 'Ready to practise →';
    },
  }, '🤔 Some words were tricky');
  box.append(
    h('h3', {}, '🦉 Quick check'),
    h('p', { class: 'seg-text' }, 'Did you understand that?'),
    h('div', { class: 'checkin-row' }, gotIt, trickyBtn),
    out,
  );
  return box;
}

// --------------------------------------------------------------------- Q&A box

function qaBox(topic) {
  const hasKey = !!store.state.shell.apiKey;
  const chat = createChat({
    ask: hasKey
      ? (q, { onText }) => askTutor({ question: q, topic, apiKey: store.state.shell.apiKey, onText })
      : null,
    onExchange: (q, a) => logQa(topic.id, q, a, 'ai'),
  });

  const chips = h('div', { class: 'chips' },
    (topic.faqs ?? []).map((f) =>
      h('button', {
        class: 'chip',
        onclick: () => { chat.addBubble('kid', f.q); chat.addBubble('tutor', f.a); logQa(topic.id, f.q, f.a, 'faq'); },
      }, f.q)));

  const box = h('div', { class: 'qabox' }, h('h3', {}, 'Questions?'), chips, chat.thread);
  box.append(chat.inputRow ?? h('p', { class: 'qa-note' }, 'Tap a question above — or ask Mum or Dad!'));
  return box;
}

// ------------------------------------------------------------------- item view

const PART_LABEL = { diagnostic: 'Check-up', practice: 'Practise', review: 'Quick review' };

function itemView(s) {
  const item = s.items[s.idx];
  if (!item) return endItems(s);
  const q = item.q;
  const wrap = h('div', { class: 'screen' });
  wrap.append(headerBar(PART_LABEL[item.part], {
    onBack: () => exitSession(s),
    right: h('span', { class: 'count' }, `${s.idx + 1}/${s.items.length}`),
  }));
  wrap.append(progressBar(s.idx, s.items.length));

  if (item.part === 'review') {
    wrap.append(h('div', { class: 'review-tag' }, '🔁 ' + topicById(item.topicId).shortTitle));
  }

  const card = h('div', { class: 'card question' });
  // Every word of the question is tappable for its German meaning. Like the old
  // "Was heißt das?" this does NOT set item.assisted: the app measures maths,
  // not English. A single word cannot leak a method, so this is safe even in
  // the diagnostic, where language confusion would otherwise poison the priors.
  const promptEl = h('div', { class: 'prompt', html: q.prompt });
  attachGloss(promptEl, { topicId: item.topicId ?? null });
  card.append(h('div', { class: 'prompt-row' }, promptEl, speakerButton(q.prompt, { small: true })));
  if (q.svg) card.append(h('div', { class: 'vis', html: q.svg }));
  const reexplain = reexplainRow(item);
  if (reexplain) card.append(reexplain);

  const state = { tries: 0, resolved: false };
  const feedback = h('div', { class: 'feedback' });
  card.append(feedback);

  const submit = (input) => {
    if (state.resolved) return;
    const { ok } = checkAnswer(q, input);
    if (ok) return resolve(true);
    state.tries += 1;
    if (item.part === 'diagnostic' || state.tries >= 2) return resolve(false);
    // one retry with a hint
    feedback.replaceChildren(h('div', { class: 'fb try' },
      h('div', { class: 'fb-head' }, pick(makeRng(Date.now() >>> 0), ENCOURAGE)),
      q.hint ? h('div', { class: 'fb-hint', html: q.hint }) : h('div', { class: 'fb-hint' }, 'Take another look and try again.'),
    ));
  };

  const resolve = (ok) => {
    state.resolved = true;
    const firstTry = ok && state.tries === 0;
    recordResult(s, item, firstTry);
    inputHost.classList.add('locked');
    if (ok) {
      feedback.replaceChildren(h('div', { class: 'fb good' },
        h('div', { class: 'fb-head' }, '✅ ' + pick(makeRng((Date.now() % 100000) >>> 0), PRAISE)),
        state.tries > 0 ? h('div', { class: 'fb-hint' }, 'Second try counts too — well done for sticking with it!') : null,
      ));
      setTimeout(next, firstTry ? 900 : 1400);
    } else if (item.part === 'diagnostic') {
      feedback.replaceChildren(h('div', { class: 'fb neutral' },
        h('div', {}, 'Answer: ', h('b', { html: answerText(q) }))));
      setTimeout(next, 1300);
    } else {
      feedback.replaceChildren(h('div', { class: 'fb bad' },
        h('div', { class: 'fb-head' }, 'The answer is ', h('b', { html: answerText(q) })),
        q.explain ? h('div', { class: 'fb-hint', html: q.explain }) : null,
        h('button', { class: 'btn primary', onclick: next }, 'Got it →'),
      ));
    }
  };

  const next = () => { tts.stop(); s.idx += 1; persist(); go('session'); };

  const inputHost = h('div', { class: 'input-host' }, inputControl(q, submit));
  card.append(inputHost);
  wrap.append(card);
  return wrap;
}

// "Show the explanation again" — the way back to the lesson in ENGLISH, which
// replaced the German full-text translation. Offered on practice AND review
// items (a reviewed topic may be a week old); not in the diagnostic, whose
// items belong to no topic. It costs no mastery: looking the method up is the
// behaviour we want, and punishing it would only produce guessing.
function reexplainRow(item) {
  const topic = item.topicId ? topicById(item.topicId) : null;
  if (!topic?.explanation?.segments?.length) return null;
  return h('div', { class: 'reexplain-row' },
    h('button', {
      class: 'seg-alt reexplain',
      onclick: () => { tts.stop(); explanationSheet(topic); },
    }, '📖 Show the explanation again'));
}

function inputControl(q, submit) {
  switch (q.kind) {
    case 'num':
      return h('div', {},
        q.unit ? h('div', { class: 'unit-note' }, 'Answer in ', h('b', {}, q.unit)) : null,
        numberPad({ allowMinus: !!q.allowMinus || q.answer < 0, allowDecimal: !Number.isInteger(q.answer) || !!q.allowDecimal, onSubmit: submit }));
    case 'mc':
      return h('div', { class: 'options' },
        q.options.map((opt, i) =>
          h('button', { class: 'opt', html: String(opt), onclick: (e) => {
            e.currentTarget.classList.add('picked');
            submit(i);
          } })));
    case 'tf':
      return h('div', { class: 'options tfrow' },
        h('button', { class: 'opt tf', onclick: () => submit(true) }, '✓ True'),
        h('button', { class: 'opt tf', onclick: () => submit(false) }, '✗ False'));
    case 'frac':
      return fractionPad({ onSubmit: submit });
    case 'order':
      return orderPicker(q, { onSubmit: submit });
    default:
      return h('div', {}, 'Unknown question type');
  }
}

function recordResult(s, item, firstTryOk) {
  s.results.push({ part: item.part, topicId: item.topicId, ok: firstTryOk });
  if (item.part === 'diagnostic') {
    const d = (s.diag[item.strand] ??= { correct: 0, total: 0 });
    d.total += 1;
    if (firstTryOk) d.correct += 1;
  } else {
    // item.assisted is set by the buddy when the child chose "help me" on this
    // question. Booking it as assisted halves the upward mastery move (a wrong
    // answer stays fully wrong). Help tapped after the answer resolves can't
    // retro-dampen — recordResult has already run — which is fine: only help
    // taken before answering counts.
    recordAttempt(cur(), item.topicId, item.q.tier, firstTryOk, s.day, { assisted: !!item.assisted });
  }
  persist();
}

// --------------------------------------------------------------------- summary

function endItems(s) {
  if (s.phase !== 'summary') {
    applySessionEnd(cur(), s, s.day); // completion effects + slot bookkeeping
    persist();
  }
  return summaryView(s);
}

function summaryView(s) {
  const wrap = h('div', { class: 'screen center' });
  const card = h('div', { class: 'card summary' });
  const name = store.state.shell.name;

  if (s.summary.kind === 'diagnostic') {
    card.append(
      h('div', { class: 'big-emoji' }, '🎯'),
      h('h1', {}, 'All warmed up' + (name ? ', ' + name : '') + '!'),
      h('p', {}, 'Now I know what to practise with you. Tomorrow we start properly — one topic a day.'),
    );
  } else {
    const t = s.newTopic ? topicById(s.newTopic) : null;
    card.append(h('div', { class: 'big-emoji' }, '🏅'), h('h1', {}, 'Session done!'));
    if (t && s.summary.stars != null) {
      card.append(h('p', { class: 'sum-line' }, t.title), starRow(s.summary.stars, { size: 'lg' }));
    }
    if (s.summary.practice?.total) {
      card.append(h('p', { class: 'sum-line' }, `Practise: ${s.summary.practice.ok} of ${s.summary.practice.total} first try`));
    }
    if (s.summary.review?.total) {
      card.append(h('p', { class: 'sum-line' }, `Review: ${s.summary.review.ok} of ${s.summary.review.total}`));
    }
    card.append(h('p', { class: 'sum-streak' }, `🔥 Streak: ${store.state.shell.streak.count} day${store.state.shell.streak.count === 1 ? '' : 's'}`));
  }
  // Catch-up: when the target date needs more than one topic a day, offer the
  // next topic right here — one tap, no detour via the map. Capped at two topics
  // a day, so finishing the plan feels like an end rather than a treadmill.
  const today = dayKey();
  const pace = pacing(cur(), topicOrder, today);
  const nextId = nextNewTopic(cur(), topicOrder, journeyMeta);
  if (s.summary.kind !== 'diagnostic' && s.summary.stars != null && pace?.needTwo && nextId
      && topicsDoneToday(cur(), today) < 2) {
    const nt = topicById(nextId);
    card.append(
      h('p', { class: 'sum-line' }, `🏁 ${pace.remaining} topics in ${pace.daysLeft} days — one short second topic keeps you on track!`),
      h('button', {
        class: 'btn primary wide big',
        onclick: () => {
          if (s.focus) cur().focusSession = null;
          else cur().activeSession = null;
          startFocusSession(nextId, 'new', 'today');
        },
      }, `🚀 Topic 2 of 2: ${nt.emoji} ${nt.shortTitle}`),
    );
  }
  card.append(h('button', {
    class: 'btn primary wide big',
    onclick: () => {
      if (s.focus) cur().focusSession = null;
      else cur().activeSession = null;
      store.save();
      go(s.origin ?? 'today');
    },
  }, 'Finish'));
  wrap.append(card);
  confettiBurst(wrap);
  return wrap;
}
