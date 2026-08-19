// Parent corner — ported from powermath-trainer @ 85699c4 and re-homed on the
// hub: shared settings (name, key, voice) live in state.shell, everything the
// engine touches in the active curriculum slice. New here: a vocabulary view
// (which English words he actually looked up) and the Year 5 backup import.

import { h, store, go, cur, toast, registerScreen, rerender } from '../shell/core.js';
import { headerBar, bandDot, starRow, numberPad } from './components.js';
import { topics, topicById } from '../maths/content/index.js';
import { exportJSON, parseImport, importY5Backup, dayKey, wipe } from '../shell/storage.js';
import { normaliseWord } from '../maths/content/glossary.js';
import { subjectOfDay, lastNewTopicDay, activeDeferrals, undeferTopic, DEFER_DAYS } from '../shell/rhythm.js';
import { testKey } from '../qa/tutor.js';
import * as tts from '../tts.js';
import { englishSection } from '../english/ui/parent-section.js';

// What kind of help each logged entry was. 'translate'/'wordhelp' were the Y5
// full-text German paths, retired 2026-08-16; they stay in the map so imported
// Year 5 logs keep their icon.
const QA_ICON = {
  ai: '🤖',          // asked the tutor a question
  faq: '💡',         // tapped a ready-made question chip
  gloss: '📖',       // tapped one English word for its German meaning
  reexplain: '↩︎',   // reopened the lesson explanation during practice
  translate: '🇩🇪',  // retired
  wordhelp: '🔤',    // retired
};

const CURRICULUM_LABEL = { y6: 'Year 6', y5: 'Year 5 (review)' };

// ------------------------------------------------------------------ gate

registerScreen('parentgate', () => {
  const a = 12 + Math.floor(Math.random() * 15);
  const b = 13 + Math.floor(Math.random() * 15);
  const wrap = h('div', { class: 'screen' });
  wrap.append(headerBar('Parent corner', { onBack: () => go('home') }));
  wrap.append(h('div', { class: 'card' },
    h('h2', {}, 'Grown-ups only 🔐'),
    h('p', {}, `To continue, work out: ${a} + ${b}`),
    numberPad({
      onSubmit: (v) => {
        if (Number(v) === a + b) go('parent');
        else { toast('Not quite — try again'); rerender(); }
      },
    })));
  return wrap;
});

// ------------------------------------------------------------------ main

registerScreen('parent', () => {
  const shell = store.state.shell;
  const slice = cur();
  const wrap = h('div', { class: 'screen parent' });
  wrap.append(headerBar('Parent corner', { onBack: () => go('home') }));

  // No curriculum switcher yet, on purpose: the Year 5 TOPIC MODULES have not
  // been ported (that is phase B4), so switching to an imported y5 slice would
  // render this screen against the Year 6 topic list and show nothing but
  // dashes. The import below still runs — it preserves the scores now, which is
  // the part that would otherwise be lost.

  // ---- overview ----
  const ov = section('Progress overview');
  const totalSessions = slice.history.length;
  const minutes = slice.history.reduce((a, s) => a + (s.minutes || 0), 0);
  ov.append(h('p', { class: 'muted' },
    `${slice.completed.length}/${topics.length} topics · ${totalSessions} sessions · ~${minutes} min total · streak ${shell.streak.count}`));
  const table = h('div', { class: 'ptable' });
  table.append(h('div', { class: 'prow phead' },
    h('span', {}, 'Topic'), h('span', {}, 'Level'), h('span', {}, 'Stars'), h('span', {}, 'Next review')));
  for (const t of topics) {
    const m = slice.mastery[t.id];
    const done = slice.completed.includes(t.id);
    table.append(h('div', { class: 'prow' + (done ? '' : ' dim') },
      h('span', { class: 'pt-title' }, t.shortTitle),
      h('span', {}, m ? [bandDot(m.score), ' ', String(m.score)] : '—'),
      done ? starRow(slice.stars[t.id] ?? 0, { size: 'sm' }) : h('span', {}, '—'),
      h('span', {}, done && m?.due ? m.due.slice(5) : '—'),
    ));
  }
  ov.append(table);
  wrap.append(ov);

  // ---- history ----
  const hist = section('Recent sessions');
  const items = slice.history.slice(-14).reverse();
  if (!items.length) hist.append(h('p', { class: 'muted' }, 'No sessions yet.'));
  for (const s of items) {
    const label = s.kind === 'diagnostic' ? 'Warm-up check'
      : s.topicId ? (topicById(s.topicId)?.shortTitle ?? s.topicId) : 'Review';
    hist.append(h('div', { class: 'hrow' },
      h('span', {}, s.day), h('span', { class: 'grow' }, label),
      h('span', {}, `${s.correct}/${s.total}`), h('span', { class: 'muted' }, `${s.minutes}m`)));
  }
  wrap.append(hist);

  // ---- vocabulary ----
  // Every tapped word is logged, so the log doubles as a record of the English
  // he actually stumbles over. Aggregated by word (not by tap) and sorted by
  // frequency, it is the most directly useful thing in here for a parent.
  const vocab = new Map();
  for (const e of slice.qaLog) {
    if (e.source !== 'gloss') continue;
    const key = normaliseWord(e.q) || String(e.q).toLowerCase();
    const seen = vocab.get(key);
    if (seen) { seen.n += 1; seen.day = e.day; }
    else vocab.set(key, { word: e.q, gloss: e.a, n: 1, day: e.day });
  }
  const words = [...vocab.values()].sort((a, b) => b.n - a.n || (a.day < b.day ? 1 : -1));
  const voc = section('Words he looked up');
  if (!words.length) {
    voc.append(h('p', { class: 'muted' },
      'Nothing yet. Every English word he taps in a lesson is recorded here, with its German meaning.'));
  } else {
    voc.append(h('p', { class: 'muted' },
      `${words.length} different word${words.length === 1 ? '' : 's'}, most-looked-up first. `
      + 'Looking words up costs no score — the app measures maths, not English — so this list is a '
      + 'reading-help record, not a warning sign.'));
    for (const w of words.slice(0, 40)) {
      voc.append(h('div', { class: 'vrow' },
        h('b', { class: 'grow' }, w.word),
        h('span', { class: 'muted' }, w.gloss),
        w.n > 1 ? h('span', { class: 'vcount' }, `×${w.n}`) : null,
      ));
    }
    if (words.length > 40) voc.append(h('p', { class: 'muted' }, `… and ${words.length - 40} more.`));
  }
  wrap.append(voc);

  // ---- English (Wordforge) ----
  wrap.append(englishSection(h, section));

  // ---- pace ----
  const pc = section('Pace');
  pc.append(h('p', { class: 'muted' },
    'Year 6 has to last a school year and stay roughly level with what the class is teaching, so the app holds '
    + 'new topics back. Maths and English alternate by day, and on a maths day a NEW topic only starts once the '
    + 'gap below has passed — the days in between are review.'));
  const every = h('input', {
    type: 'number', class: 'text-in', min: '0', max: '30',
    value: String(slice.settings.newTopicEveryDays ?? 6),
  });
  every.addEventListener('change', () => {
    const v = Math.max(0, Math.min(30, Number(every.value) || 0));
    slice.settings.newTopicEveryDays = v;
    store.save();
    toast(v ? `New topic every ${v} days` : 'Throttle off — a new topic every maths day');
    go('parent');
  });
  const last = lastNewTopicDay(slice);
  pc.append(h('label', { class: 'lab' }, 'Days between new topics (0 = no limit)'), every,
    h('p', { class: 'muted' },
      `Today is a${subjectOfDay(dayKey()) === 'maths' ? ' maths' : 'n English'} day. `
      + (last ? `Last new topic: ${last}.` : 'No topic started yet.')));

  // Topics the child pushed back with "we have not had this in class yet".
  const deferredIds = activeDeferrals(slice, dayKey());
  if (deferredIds.length) {
    pc.append(h('h3', { class: 'sub' }, 'Pushed back'),
      h('p', { class: 'muted' },
        `He tapped "we have not had this in class yet" on these. They come back on their own after ${DEFER_DAYS} days `
        + '— the teaching plan is roughly known, so a week is usually enough for the class to arrive. You can also '
        + 'put one back now.'));
    for (const id of deferredIds) {
      const topic = topicById(id);
      pc.append(h('div', { class: 'vrow' },
        h('b', { class: 'grow' }, topic ? `${topic.emoji} ${topic.shortTitle}` : id),
        h('span', { class: 'muted' }, slice.deferred[id]),
        h('button', {
          class: 'btn subtle',
          onclick: () => { undeferTopic(slice, id); store.save(); toast('Back in rotation'); go('parent'); },
        }, 'Back in rotation')));
    }
  }
  wrap.append(pc);

  // ---- AI tutor ----
  const ai = section('AI tutor (optional)');
  ai.append(h('p', { class: 'muted' },
    'The tutor answers his own questions during explanations, and translates tapped words the built-in '
    + 'dictionary does not know.'),
    h('p', { class: 'muted' },
      'On the Cloudflare build the key lives on the server and there is nothing to enter here — leave this empty. '
      + 'The field is only for the GitHub Pages build, which has no server: there the key is stored on this device '
      + 'alone and is never part of a backup. Either way, "Test" checks whether the tutor actually answers.'));
  const keyIn = h('input', {
    class: 'text-in', type: 'password', placeholder: 'sk-ant-…',
    value: shell.apiKey || '', autocomplete: 'off',
  });
  const status = h('span', { class: 'muted key-status' },
    shell.apiKey ? 'Key saved on this device.' : 'No key here — fine on the server build; on GitHub Pages the dictionary and chips still work offline.');
  const saveBtn = h('button', {
    class: 'btn', onclick: () => {
      shell.apiKey = keyIn.value.trim();
      store.save();
      status.textContent = shell.apiKey ? 'Key saved.' : 'Key removed.';
      toast('Saved');
    },
  }, 'Save key');
  const testBtn = h('button', {
    class: 'btn subtle', onclick: async () => {
      const k = keyIn.value.trim();
      if (!k) return toast('Enter a key first');
      status.textContent = 'Testing…';
      try {
        await testKey(k);
        status.textContent = '✅ Key works.';
      } catch (e) {
        status.textContent = describeTutorError(e);
      }
    },
  }, 'Test tutor');
  ai.append(h('div', { class: 'row gap' }, keyIn), h('div', { class: 'row gap' }, saveBtn, testBtn, status));

  const log = slice.qaLog.slice(-20).reverse();
  if (log.length) {
    ai.append(h('h3', { class: 'sub' }, 'Recent help'));
    ai.append(h('p', { class: 'muted' },
      '🤖 asked the tutor · 💡 tapped a ready question · 📖 looked up one English word '
      + '· ↩︎ reopened the explanation while practising.'));
    for (const e of log) {
      ai.append(h('div', { class: 'qlog' },
        h('div', { class: 'qlog-q' }, `${e.day} · ${QA_ICON[e.source] ?? '💬'} ${e.q}`),
        h('div', { class: 'qlog-a muted' }, e.a)));
    }
  }
  wrap.append(ai);

  // ---- buddy chats ----
  const chats = slice.chats.slice(-12).reverse();
  if (chats.length) {
    const bud = section('Buddy chats');
    bud.append(h('p', { class: 'muted' },
      'The floating Buddy button answers quick questions anywhere. A 🤝 means he asked for help ON a practice '
      + 'question — that answer counts half towards the topic score (stars are unaffected), so the topic comes '
      + 'round again sooner.'));
    for (const c of chats) {
      const head = `${c.day} · ${c.view === 'question' ? '❓' : '💬'} ${c.topicName ?? 'General'}`
        + (c.assisted ? ' · 🤝 helped' : '');
      bud.append(h('div', { class: 'qlog' },
        h('div', { class: 'qlog-q' }, head),
        h('div', { class: 'qlog-a muted' },
          (c.messages ?? []).map((m) => h('div', {}, (m.role === 'kid' ? '🧒 ' : '🦉 ') + m.content)))));
    }
    wrap.append(bud);
  }

  // ---- child & voice ----
  const pers = section('Child & voice');
  const nameIn = h('input', { class: 'text-in', placeholder: "Child's first name", value: shell.name || '' });
  pers.append(h('div', { class: 'row gap' }, nameIn,
    h('button', { class: 'btn', onclick: () => { shell.name = nameIn.value.trim(); store.save(); toast('Saved'); } }, 'Save')));
  const voices = tts.englishVoices();
  const sel = h('select', { class: 'text-in' },
    h('option', { value: '' }, 'Automatic (British English preferred)'),
    voices.map((v) => h('option', { value: v.voiceURI, selected: shell.voiceURI === v.voiceURI }, `${v.name} (${v.lang})`)));
  sel.addEventListener('change', () => { shell.voiceURI = sel.value || null; store.save(); });
  const rate = h('input', { type: 'range', min: '0.7', max: '1.15', step: '0.05', value: String(shell.rate) });
  rate.addEventListener('change', () => { shell.rate = Number(rate.value); store.save(); });
  // Pacing is per curriculum: Year 6 runs a school year, an imported Year 5 has
  // no deadline at all.
  const target = h('input', { type: 'date', class: 'text-in', value: slice.settings.targetDate || '' });
  target.addEventListener('change', () => {
    slice.settings.targetDate = target.value || null;
    store.save();
    toast(target.value ? 'Target date saved' : 'Target date cleared — no catch-up pacing');
  });
  pers.append(h('label', { class: 'lab' }, 'Voice'), sel,
    h('label', { class: 'lab' }, 'Speaking speed'), rate,
    h('label', { class: 'lab' },
      `Finish ${CURRICULUM_LABEL[store.state.maths.active] ?? 'this curriculum'} by (drives the "one more topic today" catch-up; clear to switch off)`),
    target,
    h('button', {
      class: 'btn subtle',
      onclick: () => tts.speak('Hello! Three times four makes twelve.', { rate: shell.rate, voiceURI: shell.voiceURI }),
    }, '▶ Test voice'));
  wrap.append(pers);

  // ---- backup ----
  const bk = section('Backup');
  bk.append(h('p', { class: 'muted' },
    'Progress lives on this device. Export a backup file every week or two (it can be AirDropped or saved to Files). ',
    shell.lastExport ? `Last export: ${shell.lastExport.slice(0, 10)}.` : 'No export yet.'));
  const exportBtn = h('button', {
    class: 'btn', onclick: () => {
      shell.lastExport = new Date().toISOString();
      store.save();
      const blob = new Blob([exportJSON(store.state)], { type: 'application/json' });
      const a = h('a', { href: URL.createObjectURL(blob), download: `lernapp-backup-${dayKey()}.json` });
      document.body.append(a); a.click(); a.remove();
      toast('Backup exported');
      rerender();
    },
  }, '⬇ Export backup');
  const fileIn = h('input', { type: 'file', accept: 'application/json,.json', style: { display: 'none' } });
  fileIn.addEventListener('change', async () => {
    const f = fileIn.files[0];
    if (!f) return;
    try {
      const imported = parseImport(await f.text());
      imported.shell.apiKey = shell.apiKey; // the device's key is not in backups
      store.state = imported;
      store.save();
      toast('Backup restored');
      go('parent');
    } catch (e) { toast(e.message); }
  });
  const importBtn = h('button', { class: 'btn subtle', onclick: () => fileIn.click() }, '⬆ Restore from backup');
  bk.append(h('div', { class: 'row gap' }, exportBtn, importBtn, fileIn));

  // Year 5 import: a PowerMath Trainer backup becomes the y5 review curriculum.
  const y5In = h('input', { type: 'file', accept: 'application/json,.json', style: { display: 'none' } });
  y5In.addEventListener('change', async () => {
    const f = y5In.files[0];
    if (!f) return;
    try {
      importY5Backup(store.state, await f.text());
      store.save();
      toast(`Year 5 imported — ${store.state.maths.y5.completed.length} topics for review`);
      go('parent');
    } catch (e) { toast(e.message); }
  });
  const y5 = store.state.maths.y5;
  bk.append(h('h3', { class: 'sub' }, 'Year 5'),
    h('p', { class: 'muted' },
      'A PowerMath Trainer (Year 5) backup can be imported here. The scores are stored straight away; the Year 5 '
      + 'topics themselves become practisable review material in a later update. The Year 5 streak and its summer '
      + 'deadline are deliberately not carried over.'),
    // Spread, never `cond ? el : null` as an append argument: append is the raw
    // DOM method and stringifies a null child into the literal text "null".
    ...(y5 ? [h('p', { class: 'muted' },
      `✅ Imported: ${y5.completed.length} topics with their scores, waiting for the Year 5 lessons to arrive.`)] : []),
    h('div', { class: 'row gap' },
      h('button', { class: 'btn subtle', onclick: () => y5In.click() }, '📦 Import Year 5 backup'), y5In));
  wrap.append(bk);

  // ---- danger ----
  const dz = section('Start over');
  dz.append(h('button', {
    class: 'btn danger', onclick: () => {
      if (confirm('Delete ALL progress on this device? Export a backup first if unsure.')) {
        wipe();
        location.reload();
      }
    },
  }, 'Reset everything'));
  wrap.append(dz);

  return wrap;
});

function section(title) {
  return h('div', { class: 'card psec' }, h('h2', { class: 'psec-title' }, title));
}

// Turn a TutorError into something a parent can act on — including the API's
// own wording, which names the real problem (bad key, no credit, wrong model).
function describeTutorError(e) {
  if (!e) return '❌ Unknown error.';
  if (e.kind === 'offline') return '❌ This device reports no internet connection.';
  if (e.kind === 'blocked') {
    return '❌ The request never reached api.anthropic.com — a content blocker, VPN or network filter is likely blocking it. '
      + (e.detail ? `(${e.detail})` : '');
  }
  if (e.kind === 'http') {
    const head = {
      400: 'Request refused (400)',
      401: 'Key rejected (401) — check for a typo or a deleted key',
      403: 'Not permitted (403)',
      404: 'Not found (404) — the model may be unavailable on this account',
      429: 'Rate limited (429) — try again in a moment',
    }[e.status] || `API error (${e.status})`;
    return `❌ ${head}.` + (e.detail ? ` ${e.detail}` : '');
  }
  return `❌ ${e.message || 'Unknown error.'}`;
}
