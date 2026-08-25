// Global AI Buddy: a floating help button (FAB) that opens a bottom-sheet chat,
// reachable anywhere except the explanation screen (where the in-lesson qaBox
// owns the chat). When a practice question is on screen it offers an intent
// choice — "help me with this" flags the question so answering it books only
// half mastery credit. The buddy itself is agnostic about what "assisted"
// means; updateBuddy() wires the onAssist callback that mutates the session.

import { h, store, cur, currentScreen } from '../shell/core.js';
import { createChat, escapeHtml } from './chat.js';
import { askTutor, buddySystemPrompt } from '../qa/tutor.js';
import { aiReady } from '../qa/endpoint.js';
import { topicById } from '../maths/content/index.js';
import { dayKey } from '../engine/storage.js';

// Inline SVG speech-bubble-with-spark, not an emoji (crisp at any DPI).
const ICON = '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.5 8.5 0 0 1-11.9 7.8L3 21l1.7-6.1A8.5 8.5 0 1 1 21 11.5Z"/><path d="M12 8v4M12 15h.01"/></svg>';

let fab = null;
let mounted = false;
let ctx = { view: 'today' };   // { view, questionId?, question?, topicId?, topicName?, stem?, onAssist? }
let chatKey = null;            // discriminator: a fresh chat record per question/view
let record = null;            // the persisted conversation for the current chatKey
let assisted = false;         // did the child pick "help me" for the current question?

export function mountBuddy() {
  if (mounted) return;
  mounted = true;
  fab = h('button', { class: 'buddy-fab', 'aria-label': 'Ask Buddy', html: ICON, onclick: openSheet });
  fab.style.display = 'none';
  document.body.append(fab);
}

export function setBuddyVisible(visible) {
  if (fab) fab.style.display = visible ? '' : 'none';
}

export function setBuddyContext(next) {
  ctx = next || { view: 'today' };
  // A new question (or a new view) starts a fresh conversation; the same
  // question keeps its record so reopening replays what was said.
  const key = ctx.question ? `q:${ctx.questionId}` : `v:${ctx.view}`;
  if (key !== chatKey) { chatKey = key; record = null; assisted = false; }
}

export function clearBuddyContext() {
  setBuddyContext({ view: currentScreen() });
}

// Append one exchange to the persisted conversation (upsert per chatKey).
function recordTurn(q, a) {
  if (!record) {
    record = {
      day: dayKey(), startedAt: Date.now(), finishedAt: Date.now(),
      view: ctx.view, questionId: ctx.questionId ?? null,
      topicId: ctx.topicId ?? null, topicName: ctx.topicName ?? null, stem: ctx.stem ?? null,
      assisted, messages: [],
    };
    cur().chats.push(record);
  }
  record.assisted = record.assisted || assisted;
  record.finishedAt = Date.now();
  record.messages.push({ role: 'kid', content: q }, { role: 'buddy', content: a });
  store.save();
}

function openSheet() {
  const chat = createChat({
    ask: (q, { onText }) => askTutor({
      question: q, apiKey: store.state.shell.apiKey, onText,
      system: buddySystemPrompt({ topicName: ctx.topicName, stem: ctx.stem }),
    }),
    onExchange: recordTurn,
    placeholder: 'Ask Buddy anything…',
  });
  // Replay the current question's conversation on reopen.
  if (record) {
    for (const m of record.messages) {
      chat.addBubble(m.role === 'kid' ? 'kid' : 'tutor', escapeHtml(m.content));
    }
  }

  const close = () => scrim.remove();
  const scrim = h('div', {
    class: 'sheet-scrim buddy-scrim', role: 'dialog', 'aria-modal': 'true', tabindex: '-1',
    onclick: (e) => { if (e.target === scrim) close(); },
    onkeydown: (e) => { if (e.key === 'Escape') close(); },
  });

  // Intent choice only while a practice question is on screen.
  let intentRow = null;
  if (ctx.question) {
    const notice = h('p', { class: 'muted center-t buddy-note' });
    const chooseHelp = () => {
      assisted = true;
      if (record) record.assisted = true;
      ctx.onAssist?.();
      notice.textContent = 'Counts as help — this question stays in practice a bit longer, but your stars are safe.';
      intentChips.replaceWith(notice);
    };
    const chooseSide = () => {
      notice.textContent = 'Side question — this does not change your score for the question on screen.';
      intentChips.replaceWith(notice);
    };
    const intentChips = h('div', { class: 'chips buddy-intent' },
      h('button', { class: 'chip', onclick: chooseHelp }, '🙋 Help me with this'),
      h('button', { class: 'chip', onclick: chooseSide }, '💬 Just a side question'));
    intentRow = assisted
      ? h('p', { class: 'muted center-t buddy-note' }, 'Counts as help — your stars are safe.')
      : intentChips;
  }

  const sheet = h('div', { class: 'card station-sheet buddy-sheet' },
    h('div', { class: 'sheet-title' }, '🦉 Buddy'),
    intentRow,
    chat.thread,
    chat.inputRow);
  scrim.append(sheet);
  document.body.append(scrim);
  scrim.focus();
  chat.inputRow?.querySelector('input')?.focus();
}

// Fires after every navigation (registered via onAfterRender). Decides FAB
// visibility and context from the current screen + active session.
export function updateBuddy() {
  // Not "is a key on this device": on the Cloudflare build the key is the
  // server's, and asking the old question hid the buddy on the one host where
  // it works (qa/endpoint.js).
  const hasKey = aiReady(store.state.shell.apiKey);
  const screen = currentScreen();
  const allowed = ['home', 'today', 'map', 'session'].includes(screen);
  if (!hasKey || !allowed) { setBuddyVisible(false); clearBuddyContext(); return; }

  if (screen === 'session') {
    const s = cur().focusSession ?? cur().activeSession;
    if (!s || s.phase !== 'items') { setBuddyVisible(false); clearBuddyContext(); return; } // explain⇒qaBox, summary⇒hide
    const item = s.items[s.idx];
    if (item && item.part !== 'diagnostic') {
      const t = item.topicId ? topicById(item.topicId) : null;
      setBuddyContext({
        view: 'question', questionId: `${s.day}|${s.kind}|${s.idx}`, question: true,
        topicId: item.topicId, topicName: t?.title ?? null,
        stem: String(item.q.prompt).replace(/<[^>]*>/g, ''),
        onAssist: () => {
          // Read the item live at tap time — never a stale closure.
          const live = cur().focusSession ?? cur().activeSession;
          const it = live?.items?.[live.idx];
          if (it) { it.assisted = true; store.save(); }
        },
      });
    } else {
      // Diagnostic phase: general help only, no question ⇒ no assist intent.
      setBuddyContext({ view: 'diagnostic' });
    }
    setBuddyVisible(true);
    return;
  }

  setBuddyContext({ view: screen });   // today / map / watch ⇒ general buddy
  setBuddyVisible(true);
}
