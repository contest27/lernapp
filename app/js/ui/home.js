// The hub: one greeting, one shared streak, one card per module.
// Maths and English are siblings here — the child picks a door, the shell
// stays out of the way.

import { h, store, go, registerScreen } from '../shell/core.js';
import { dayKey, activeCurriculum } from '../shell/storage.js';
import { topicOrder } from '../maths/content/index.js';

const CURRICULUM_LABEL = { y6: 'Year 6', y5: 'Year 5 review' };

function greeting(name) {
  const hr = new Date().getHours();
  const part = hr < 11 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
  return `${part}${name ? ', ' + name : ''}! 👋`;
}

registerScreen('home', () => {
  const st = store.state;
  const wrap = h('div', { class: 'screen' });

  wrap.append(h('header', { class: 'topbar' },
    h('span', { class: 'iconbtn ghost' }),
    h('div', { class: 'topbar-title' }, greeting(st.shell.name)),
    h('button', { class: 'iconbtn', 'aria-label': 'Parent corner', onclick: () => go('parentgate') }, '⚙️'),
  ));

  const streak = st.shell.streak;
  if (streak.count > 0) {
    wrap.append(h('p', { class: 'hub-streak' },
      `🔥 ${streak.count} learning day${streak.count === 1 ? '' : 's'} in a row`));
  }

  // ---- maths card
  const cur = activeCurriculum(st);
  const done = cur.completed.length;
  const total = topicOrder.length;
  const label = CURRICULUM_LABEL[st.maths.active] ?? st.maths.active;
  wrap.append(h('button', { class: 'card hub-card hub-go', onclick: () => go('today') },
    h('div', { class: 'hub-emoji' }, '🧮'),
    h('h2', {}, 'Maths'),
    h('p', { class: 'muted' }, `${label} · ${done}/${total} topics`),
    h('p', { class: 'hub-cta' }, 'Open ▶'),
  ));

  // ---- english card
  wrap.append(h('div', { class: 'card hub-card' },
    h('div', { class: 'hub-emoji' }, '📚'),
    h('h2', {}, 'English'),
    h('p', { class: 'muted hub-soon' }, 'Wordforge moves in here — reading, talking, and the forge.'),
  ));

  return wrap;
});
