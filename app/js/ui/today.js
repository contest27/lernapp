// The maths module's day screen — the Y5 trainer's today.js re-homed on the
// hub: name/streak come from the shell, everything the engine touches from the
// active curriculum slice. No Watch episodes (none exist for Y6 yet) and the
// map tab arrives with the map itself.

import { h, store, go, cur, registerScreen } from '../shell/core.js';
import { bottomNav, progressBar } from './components.js';
import { planSession, pacing } from '../engine/scheduler.js';
import { dayKey, daysBetween } from '../engine/storage.js';
import { topicsDoneToday } from '../engine/progress.js';
import { makeRng, seedFromString } from '../engine/rng.js';
import { topicOrder, topicById, journeyMeta } from '../maths/content/index.js';
import { startOrResume, startFocusSession } from './session.js';

registerScreen('today', () => {
  const shell = store.state.shell;
  const slice = cur();
  const today = dayKey();
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const wrap = h('div', { class: 'screen home' });

  // Long-press the gear to reach the parent corner.
  const gear = h('button', { class: 'gear', 'aria-label': 'Parent corner' }, '⚙️');
  let holdTimer = null;
  const startHold = () => { holdTimer = setTimeout(() => go('parentgate'), 1200); };
  const endHold = () => clearTimeout(holdTimer);
  gear.addEventListener('pointerdown', startHold);
  gear.addEventListener('pointerup', endHold);
  gear.addEventListener('pointerleave', endHold);

  wrap.append(h('div', { class: 'home-top' },
    h('div', {},
      h('h1', { class: 'greet' }, `${greet}${shell.name ? ', ' + shell.name : ''}! 👋`),
      h('p', { class: 'streakline' }, shell.streak.count > 0 ? `🔥 ${shell.streak.count}-day streak` : 'Ready for today?'),
    ),
    gear,
  ));

  const doneToday = shell.streak.lastDay === today;
  const resumable = slice.activeSession && slice.activeSession.day === today && slice.activeSession.phase !== 'summary';
  const rng = makeRng(seedFromString(today));
  const plan = planSession(slice, topicOrder, today, rng, journeyMeta);
  const pace = pacing(slice, topicOrder, today);
  // Catch-up day, first topic already done: the second one is the plan, not a
  // bonus (see the Y5 trainer's 2026-08-10 rationale).
  const secondPending = !resumable && doneToday && plan.kind === 'daily'
    && !!pace?.needTwo && topicsDoneToday(slice, today) < 2;

  const card = h('div', { class: 'card today-card' });
  if (resumable) {
    card.append(h('h2', {}, 'Session in progress'),
      h('p', {}, 'You were part-way through. Pick up where you left off!'));
  } else if (plan.kind === 'diagnostic') {
    card.append(h('h2', {}, 'Warm-up check 🎯'),
      h('p', {}, 'A quick mix of questions so the app learns what you already rock at. No pressure — just have a go!'));
  } else if (plan.kind === 'daily') {
    const t = topicById(plan.newTopic);
    const extra = plan.extraTopic ? topicById(plan.extraTopic) : null;
    // Built as a list, never append(cond ? el : null): raw append renders a
    // null child as the literal text "null".
    const notes = [];
    if (secondPending) {
      notes.push(h('p', { class: 'muted' }, 'A short one to stay on track — five questions, no review.'));
    } else {
      if (plan.review.length) notes.push(h('p', { class: 'muted' }, 'Plus a quick review of earlier topics.'));
      if (extra && !doneToday) {
        notes.push(h('p', { class: 'muted' },
          `🏁 Catch-up day: ${extra.emoji} ${extra.shortTitle} follows straight after — a short one.`));
      }
    }
    card.append(h('h2', {}, secondPending ? 'Topic 2 of 2 🏁' : "Today's topic"),
      h('p', { class: 'topic-name' }, t.emoji + ' ' + t.title), ...notes);
  } else {
    card.append(h('h2', {}, 'Review day 💪'),
      h('p', {}, 'All topics done — time to make them stick!'));
  }

  card.append(h('button', {
    class: 'btn primary wide big start',
    onclick: secondPending ? () => startFocusSession(plan.newTopic, 'new', 'today') : startOrResume,
  }, resumable ? 'Continue ▶' : secondPending ? 'Start topic 2 ▶' : doneToday ? 'Practise again ▶' : 'Start ▶'));
  if (doneToday && !resumable && !secondPending) {
    card.append(h('p', { class: 'muted center-t' }, '✅ Done for today — extra practice is always welcome!'));
  }
  wrap.append(card);

  // Curriculum progress (+ finish-by-target pace line when one is set)
  const total = topicOrder.length;
  const done = slice.completed.length;
  const [, tm, td] = (slice.settings.targetDate || '').split('-');
  const targetLabel = td ? `${Number(td)} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][Number(tm) - 1]}` : '';
  wrap.append(h('div', { class: 'card slim' },
    h('div', { class: 'row spread' }, h('b', {}, 'Year 6 journey'), h('span', {}, `${done}/${total} topics`)),
    progressBar(done, total),
    pace ? h('p', { class: 'muted' },
      pace.needTwo
        ? `🏁 To finish by ${targetLabel}: ${Math.ceil(pace.perDay)} topics a day (${pace.remaining} to go, ${pace.daysLeft} days).`
        : `🏁 On track for ${targetLabel}: one topic a day is enough (${pace.remaining} to go).`) : null));

  // Backup nudge for the parent (shows only after real usage).
  const needNudge = slice.history.length >= 4 &&
    (!shell.lastExport || daysBetween(shell.lastExport.slice(0, 10), today) >= 7);
  if (needNudge) {
    wrap.append(h('div', { class: 'nudge' },
      '💾 Parents: it has been a while since the last backup. Hold ⚙️ to open the Parent corner.'));
  }

  wrap.append(bottomNav('today', go));
  return wrap;
});
