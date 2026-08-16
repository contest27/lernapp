// The pieces a lesson explanation is made of — and a way back to them.
//
// `segmentEl` and `exampleEl` were lifted out of session.js so two screens can
// share them: the guided lesson (which walks the segments one part at a time)
// and `explanationSheet`, which puts the whole explanation back on screen while
// the child is practising. That sheet is the replacement for the old German
// full-text translation: when he is stuck mid-practice he now gets the lesson
// again in ENGLISH, with every word tappable, instead of a German summary that
// let him skip the English for good.

import { h, store, logQa } from '../shell/core.js';
import { speakerButton, stripForSpeech } from './components.js';
import { attachGloss, closeGloss } from './gloss.js';
import * as tts from '../tts.js';

// One explanation segment: text, optional diagram, read-aloud, and the "say it
// differently" rephrasing (still English — simpler English is the point).
export function segmentEl(seg, topic) {
  let showingAlt = false;
  const textEl = h('p', { class: 'seg-text', html: seg.text });
  const visEl = seg.svg ? h('div', { class: 'vis', html: seg.svg }) : null;
  const playBtn = h('button', { class: 'seg-play', 'aria-label': 'Play this part' }, '🔊');
  const altBtn = seg.alt ? h('button', { class: 'seg-alt' }, '✨ Say it differently') : null;
  const box = h('div', { class: 'segment' },
    h('div', { class: 'seg-row' }, playBtn, textEl),
    visEl,
    altBtn && h('div', { class: 'seg-altrow' }, altBtn),
  );
  const read = () => {
    const { rate, voiceURI } = store.state.shell;
    box.classList.add('playing');
    tts.speak(stripForSpeech(showingAlt ? seg.alt : seg.text), {
      rate, voiceURI, onend: () => box.classList.remove('playing'),
    });
  };
  playBtn.addEventListener('click', read);
  altBtn?.addEventListener('click', () => {
    showingAlt = !showingAlt;
    textEl.innerHTML = showingAlt ? seg.alt : seg.text;
    attachGloss(textEl, { topicId: topic?.id ?? null }); // innerHTML wiped the word buttons
    altBtn.textContent = showingAlt ? '↩︎ Back to first version' : '✨ Say it differently';
    read();
  });
  attachGloss(textEl, { topicId: topic?.id ?? null });
  return box;
}

export function exampleEl(topic) {
  const ex = h('div', { class: 'example' }, h('h3', {}, 'Worked example'));
  if (topic.example.svg) ex.append(h('div', { class: 'vis', html: topic.example.svg }));
  topic.example.steps.forEach((st, i) => {
    const body = h('span', { html: st });
    attachGloss(body, { topicId: topic.id });
    ex.append(h('p', { class: 'ex-step' },
      h('span', { class: 'ex-n' }, String(i + 1)), body, speakerButton(st, { small: true })));
  });
  return ex;
}

// The whole explanation, on top of whatever screen he is on. Same bottom-sheet
// pattern as the Buddy (scrim + card, tap outside or Escape to close), so it
// never navigates away: the question underneath keeps its state and its input.
export function explanationSheet(topic) {
  if (!topic?.explanation?.segments?.length) return;

  const close = () => { tts.stop(); closeGloss(); scrim.remove(); };
  const scrim = h('div', {
    class: 'sheet-scrim explain-scrim', role: 'dialog', 'aria-modal': 'true', tabindex: '-1',
    onclick: (e) => { if (e.target === scrim) close(); },
    onkeydown: (e) => { if (e.key === 'Escape') close(); },
  });

  const sheet = h('div', { class: 'card station-sheet explain-sheet' },
    h('div', { class: 'sheet-title' }, `📖 ${topic.title}`),
    h('p', { class: 'muted center-t' }, 'The lesson again — tap any word you do not know.'),
  );
  for (const seg of topic.explanation.segments) sheet.append(segmentEl(seg, topic));
  if (topic.example) sheet.append(exampleEl(topic));
  sheet.append(h('button', { class: 'btn primary wide big', onclick: close }, 'Back to the question →'));

  scrim.append(sheet);
  document.body.append(scrim);
  scrim.focus();
  // Not a mastery penalty: looking the method up is exactly what he should do
  // when he is stuck. Logged instead, so the parent corner shows WHICH topics
  // needed a second look.
  logQa(topic.id, 'Explanation reopened', topic.title, 'reexplain');
}
