// TALK — the discussion beat, and the part his teacher actually asked for.
//
// He answers out loud where he can; typing is always available beside the
// microphone rather than behind a failure.
//
// TWO SPEECH PATHS, in this order (2026-08-24). First choice is our own
// recording transcribed by Gemini (./stt.js): it returns what he actually
// said, which is the whole point of a spoken answer. Second is the device's
// own recognition (./speech.js) - it needs Siri on and a network, is
// documented as unreliable on WebKit, and quietly corrects his English to the
// nearest plausible word, so it is the fallback, not the road. Third is
// typing, which is always there.
//
// Ported under the Lernapp hub: shell.apiKey/voiceURI/rate replace
// settings.apiKey/voiceURI/rate, en().settings.speechEnabled replaces
// settings.speechEnabled, en() replaces store.state for everything the
// engine touches, and the shared streak lives at store.state.shell.streak.

import { h, store, go, toast, en, registerScreen } from '../../shell/core.js';
import * as speech from './speech.js';
import { micButton, recordingAvailable } from './stt.js';
import { aiReady, sttReady } from '../../qa/endpoint.js';
import * as audio from './audio.js';
import * as tts from '../../tts.js';
import { gradeAnswer, talkScore } from '../qa/talk.js';
import { currentSession, elapsedSeconds } from './read.js';
import { recordChapter, record } from '../engine/vocab.js';
import { makeEntry, apply } from '../engine/level.js';
import { dayKey } from '../../engine/storage.js';
import { chapterText } from '../engine/story.js';
import { tokenise } from '../engine/vocab.js';

let talk = null;
let host = null;

export function startTalk(chapter) {
  talk = { chapter, index: 0, results: [], answer: '', listening: null, busy: false };
  return talk;
}

export function currentTalk() { return talk; }

function question() { return talk.chapter.talk[talk.index]; }

function say(text) {
  if (tts.available()) tts.speak(text, { rate: store.state.shell.rate, voiceURI: store.state.shell.voiceURI });
}

function setAnswer(text) {
  talk.answer = text;
  const box = host?.querySelector('#answer');
  if (box && box.value !== text) box.value = text;
}

// A transcript ADDS to what is already there rather than replacing it: he may
// have typed a start, or spoken twice, and losing the first half to the second
// tap would be its own small betrayal.
function appendAnswer(text) {
  const have = (talk.answer || '').replace(/\s+$/, '');
  setAnswer(have ? `${have} ${text}` : text);
  talk.spokenLast = true;
}

function startListening() {
  if (talk.listening) { talk.listening.stop(); return; }
  const btn = host.querySelector('#mic');
  btn.classList.add('live');
  btn.textContent = '⏹ stop';

  const h1 = speech.listen({
    lang: 'en-GB',
    onInterim: (t) => setAnswer(t),
  });
  talk.listening = h1;

  h1.promise
    .then((text) => { if (text) setAnswer(text); })
    .catch((e) => {
      // A refusal here is not his fault and must not read as one.
      //
      // It used to switch en().settings.speechEnabled off for good on
      // 'not-allowed'/'service-not-allowed', which let a single denied
      // permission dialog remove the microphone from the app permanently,
      // recoverable only through the parent corner where nobody would think to
      // look. A refusal now lasts exactly as long as this attempt; the parent
      // corner toggle is the only permanent switch.
      toast(e.reason || 'Speech is not working — you can type instead.');
      render();
    })
    .finally(() => {
      talk.listening = null;
      const b = host?.querySelector('#mic');
      if (b) { b.classList.remove('live'); b.textContent = '🎤 say it'; }
    });
}

async function submit() {
  const text = (talk.answer || '').trim();
  if (!text) { toast('Say or type something first.'); return; }
  // aiReady, not the bare device key: on the Cloudflare build the key lives on
  // the server, and asking the old question meant every answer, spoken or
  // typed, was refused before it was ever sent (../../qa/endpoint.js).
  if (!aiReady(store.state.shell.apiKey)) { toast('Ask a grown-up to set the app up first.'); return; }

  talk.busy = true;
  render();
  try {
    const res = await gradeAnswer({
      chapter: talk.chapter,
      question: question(),
      answer: text,
      spoken: !!talk.spokenLast,
      apiKey: store.state.shell.apiKey,
    });
    talk.results.push({ ...res, answer: text });

    // Words he produced himself are the strongest positive evidence there is.
    const today = dayKey();
    for (const w of new Set(tokenise(text))) record(en(), w, 'talk', today);
    store.save();

    talk.answer = '';
    talk.busy = false;
    talk.showing = res;
    render();
  } catch (e) {
    talk.busy = false;
    toast(e.offline ? 'No connection right now.' : 'Something went wrong — try again.');
    render();
  }
}

function next() {
  releaseMic();
  talk.showing = null;
  if (talk.index < talk.chapter.talk.length - 1) {
    talk.index += 1;
    render();
    return;
  }
  finish();
}

// End of the chapter: fold everything into state exactly once.
function finish() {
  const state = en();
  const today = dayKey();
  const rs = currentSession();
  const chapter = talk.chapter;
  const text = chapterText(chapter);
  const words = tokenise(text).length;
  const score = talkScore(talk.results);

  recordChapter(state, text, rs?.glossed ?? new Set(), today);

  const entry = makeEntry({
    day: today,
    chapterId: chapter.id,
    band: state.level.band,
    words,
    seconds: elapsedSeconds(),
    glossTaps: rs?.glossed?.size ?? 0,
    talkScore: score,
    finished: true,
  });
  state.sessions.push(entry);
  apply(state.level, entry);

  if (!state.story.completed.includes(chapter.id)) state.story.completed.push(chapter.id);

  // Tokens are the only number he ever sees, and they are a currency, not a
  // grade: three per chapter regardless of how well he did. Earning must never
  // become another place he can fall short.
  state.tokens += 3;

  // The ONE shared streak lives on the shell, not this slice — see the state
  // mapping in the handoff. finishSession-style logic ported inline because
  // Wordforge never depended on the maths module's progress.js.
  const shellStreak = store.state.shell.streak;
  if (shellStreak.lastDay !== today) {
    const yesterday = new Date(Date.now() - 86400000);
    shellStreak.count = shellStreak.lastDay === dayKey(yesterday) ? shellStreak.count + 1 : 1;
    shellStreak.lastDay = today;
  }

  state.activeChapter = null;
  store.save();
  go('en-create');
}

// Which microphone this device gets, best first. The parent-corner switch is
// the only thing that turns speech off for good.
function micMode() {
  if (!en().settings.speechEnabled) return 'none';
  if (recordingAvailable() && sttReady()) return 'gemini';
  if (speech.available()) return 'webkit';
  return 'none';
}

// A running recording must not outlive the question it belongs to.
function releaseMic() {
  talk?.micEl?.cleanup?.();
  if (talk) talk.micEl = null;
  if (talk?.listening) { talk.listening.abort(); talk.listening = null; }
}

function render() {
  if (!host || !talk) return;
  const q = question();
  const showing = talk.showing;
  const mode = micMode();
  // The mic's own status line. The button label already alternates between
  // 'stop · 12s' and 'hearing you' and is as wide as it can get, so anything
  // longer than two words belongs here rather than in the button.
  const micStatus = h('div', { class: 'muted mic-status' }, '');
  talk.micEl = mode === 'gemini'
    ? micButton({ status: micStatus, onText: (t) => appendAnswer(t) })
    : mode === 'webkit'
      ? h('button', {
          id: 'mic', class: 'btn ghost wide',
          onclick: () => { talk.spokenLast = true; startListening(); },
        }, '🎤 say it')
      : null;

  // replaceChildren() is native, not the h() helper — a bare `? h(...) :
  // null` here would stringify to a literal "null" text node, so the list is
  // filtered explicitly (see the same note in home.js).
  host.replaceChildren(...[
    h('div', { class: 'topbar' },
      h('div', { class: 'topbar-title' }, talk.chapter.title),
      h('div', { class: 'dots' },
        ...talk.chapter.talk.map((_, i) =>
          h('span', { class: 'dot' + (i === talk.index ? ' on' : i < talk.index ? ' done' : '') }))),
    ),

    h('div', { class: 'bubble ask' },
      h('div', { class: 'bubble-text' }, q.q),
      h('button', { class: 'icon small', onclick: () => say(q.q) }, '🔊'),
    ),

    showing
      ? h('div', { class: 'bubble reply' },
          h('div', { class: 'bubble-text' }, showing.reply),
          showing.nudge ? h('div', { class: 'nudge' }, showing.nudge) : null,
        )
      : null,

    showing
      ? h('div', { class: 'readbar' },
          h('button', { class: 'btn wide', onclick: next },
            talk.index < talk.chapter.talk.length - 1 ? 'next question ›' : 'to the forge →'))
      : h('div', {},
          h('textarea', {
            id: 'answer', class: 'answer', rows: 3, placeholder: 'Type your answer…',
            oninput: (e) => { talk.answer = e.target.value; talk.spokenLast = false; },
          }, talk.answer || ''),
          talk.micEl ? micStatus : null,
          h('div', { class: 'readbar' },
            talk.micEl,
            h('button', { class: 'btn wide', onclick: submit, disabled: talk.busy },
              talk.busy ? 'thinking…' : 'send'),
          ),
        ),
  ].filter(Boolean));
}

export function talkScreen() {
  const rs = currentSession();
  if (!rs) { go('en-home'); return h('div'); }
  if (!talk || talk.chapter.id !== rs.chapter.id) startTalk(rs.chapter);
  host = h('div', { class: 'screen en talk' });
  queueMicrotask(render);
  return host;
}

registerScreen('en-talk', talkScreen);
