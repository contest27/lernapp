// The English half of the parent corner. Ported from Wordforge's ui/parent.js,
// with everything the hub's own parent screen already covers dropped: the
// child's name, the Anthropic key, voice/rate, and backup/export/reset all
// live in app/js/ui/parent.js now and must not be duplicated here.
//
// Kept: reading level + vocabulary measurements (the whole point of the
// framing decision — nothing here is ever shown to the child), the forge
// prompt log, the Gemini key (optional, English-only, unused by anything else
// in the hub), the daily image cap, and the speech recognition kill-switch.
//
// Called from app/js/ui/parent.js as englishSection(h, section) and appended
// after "Words he looked up" — h and the local section(title) card helper are
// passed in rather than imported, so this stays a plain function of the
// caller's own DOM builder instead of assuming a second copy of it.

import { store, en, toast } from '../../shell/core.js';
import { summary } from '../engine/vocab.js';
import { trend } from '../engine/level.js';
import * as speech from './speech.js';

function stat(h, label, value, hint) {
  return h('div', { class: 'stat' },
    h('div', { class: 'stat-v' }, value),
    h('div', { class: 'stat-l' }, label),
    hint ? h('div', { class: 'stat-h' }, hint) : null);
}

function readingSection(h, section) {
  const slice = en();
  const t = trend(slice.level);
  const body = section('English — reading');
  if (!t) {
    body.append(h('div', { class: 'empty' }, 'No chapters read yet.'));
    return body;
  }
  const d = slice.level.lastDecision;
  body.append(
    h('div', { class: 'stats' },
      stat(h, 'band', t.band, 'of 10'),
      stat(h, 'words/min', t.wpm, null),
      stat(h, 'gloss / 100 w', t.glossPer100, 'target 2–5'),
      stat(h, 'comprehension', t.talkScore + '%', null),
      stat(h, 'finished', t.finishedRate + '%', `last ${t.chapters} chapters`),
    ),
    d ? h('div', { class: 'note' }, `Last decision: ${d.move > 0 ? 'raised' : d.move < 0 ? 'lowered' : 'held'} — ${d.why}.`) : null,
    h('div', { class: 'note' },
      'The band follows the gloss rate, never reading time: optimising for time-on-page '
      + 'would push the texts easier, which reads well and teaches nothing.'),
  );
  return body;
}

function vocabSection(h, section) {
  const v = summary(en());
  const body = section('English — vocabulary');
  body.append(h('div', { class: 'stats' },
    stat(h, 'tracked', v.tracked, 'distinct words'),
    stat(h, 'secure', v.known, 'score > 85'),
    stat(h, 'learning', v.learning, null),
    stat(h, 'new/weak', v.new, null),
    stat(h, 'produced', v.produced, 'used by him'),
  ));
  return body;
}

function promptSection(h, section) {
  const log = en().promptLog.slice(-25).reverse();
  const body = section('What he typed into the forge');
  body.append(h('div', { class: 'note' }, 'Every prompt, including anything the genie refused.'));
  if (!log.length) {
    body.append(h('div', { class: 'empty' }, 'Nothing forged yet.'));
    return body;
  }
  body.append(h('div', { class: 'log' },
    ...log.map((e) => h('div', { class: 'log-row' + (e.reject ? ' bad' : '') },
      h('div', { class: 'log-day' }, e.day),
      h('div', { class: 'log-prompt' }, e.prompt),
      h('div', { class: 'log-meta' },
        e.reject ? `BLOCKED: ${e.reject}` : '',
        e.usedPower?.length ? `used: ${e.usedPower.join(', ')}` : 'no power words',
        e.literal ? ' · literal' : ''),
    ))));
  return body;
}

function settingsSection(h, section) {
  const s = en().settings;
  const body = section('English — settings');
  body.append(
    h('label', { class: 'field' },
      h('span', {}, 'Gemini API key (optional — unused until image trophies arrive)'),
      h('input', {
        type: 'password', value: s.geminiKey ?? '', autocomplete: 'off',
        oninput: (e) => { s.geminiKey = e.target.value.trim(); store.save(); },
      })),
    h('label', { class: 'field' },
      h('span', {}, 'Daily image cap'),
      h('input', {
        type: 'number', min: '0', max: '20', value: String(s.dailyImageCap ?? 3),
        oninput: (e) => { s.dailyImageCap = Math.max(0, Math.min(20, Number(e.target.value) || 0)); store.save(); },
      })),
    h('label', { class: 'field row' },
      h('span', {}, 'Speaking (TALK) enabled'),
      h('input', {
        type: 'checkbox', checked: s.speechEnabled,
        onchange: (e) => { s.speechEnabled = e.target.checked; store.save(); toast('Saved'); },
      })),
    h('div', { class: 'note' },
      speech.available()
        ? 'Speech recognition is available on this device.'
        : 'Speech recognition is NOT available here — TALK will be typed.'),
  );
  return body;
}

export function englishSection(h, section) {
  return h('div', {},
    readingSection(h, section),
    vocabSection(h, section),
    promptSection(h, section),
    settingsSection(h, section),
  );
}
