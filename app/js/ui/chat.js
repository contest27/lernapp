// Shared streaming chat: a thread of bubbles plus (optionally) an ask row.
// The transport and logger are injected, so both the in-lesson qaBox and the
// global buddy reuse the exact same streaming/salvage/error behaviour and only
// differ in what `ask` calls (topic tutor vs buddy prompt) and what
// `onExchange` records (qaLog vs chats). Plain text only — the model never
// emits markup, so textContent is both safe and simplest.

import { h } from '../shell/core.js';
import { speakerButton } from './components.js';

export function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function friendlyTutorError(e) {
  if (e && e.status === 401) return 'The tutor key is not working — ask a parent to check it in the Parent corner.';
  if (e && e.offline) return 'I need the internet to answer that one. Try a question from the list above!';
  return 'Hmm, I could not answer just now. Try again in a moment, or ask a parent.';
}

// ask:        (question, { onText }) => Promise<string>   injected transport (null => no input row)
// onExchange: (question, answer) => void                  injected logger, fires only on a completed AI turn
// Returns { el, thread, inputRow, addBubble }.
export function createChat({ ask, onExchange = () => {}, placeholder = 'Type your own question…' }) {
  const thread = h('div', { class: 'qa-thread' });

  const addBubble = (who, html) => {
    thread.append(h('div', { class: 'bubble ' + who },
      h('div', { html }), who === 'tutor' ? speakerButton(html, { small: true }) : null));
    thread.scrollTop = thread.scrollHeight;
  };

  let inputRow = null;
  if (typeof ask === 'function') {
    const input = h('input', { class: 'qa-input', placeholder, maxlength: '200' });
    const askBtn = h('button', { class: 'btn primary' }, 'Ask');
    const run = async () => {
      const q = input.value.trim();
      if (!q) return;
      input.value = '';
      addBubble('kid', escapeHtml(q));
      // The bubble fills in as tokens arrive.
      const textEl = h('div', { class: 'tutor-stream thinking' }, 'Thinking…');
      const bubble = h('div', { class: 'bubble tutor' }, textEl);
      thread.append(bubble);
      thread.scrollTop = thread.scrollHeight;
      askBtn.disabled = true;
      let streamed = '';
      try {
        const answer = await ask(q, {
          onText: (piece) => {
            if (!streamed) textEl.classList.remove('thinking');
            streamed += piece;
            textEl.textContent = streamed;
            thread.scrollTop = thread.scrollHeight;
          },
        });
        textEl.classList.remove('thinking');
        textEl.textContent = answer;
        bubble.append(speakerButton(answer, { small: true }));
        onExchange(q, answer);
      } catch (e) {
        if (streamed.trim()) {
          textEl.classList.remove('thinking');
          bubble.append(h('div', { class: 'tutor-note' }, '… oops, that got cut off — try asking again.'));
        } else {
          bubble.remove();
          addBubble('tutor', escapeHtml(friendlyTutorError(e)));
        }
      }
      askBtn.disabled = false;
    };
    askBtn.addEventListener('click', run);
    input.addEventListener('keydown', (e) => e.key === 'Enter' && run());
    inputRow = h('div', { class: 'qa-inputrow' }, input, askBtn);
  }

  const el = h('div', { class: 'chat' }, thread, inputRow);
  return { el, thread, inputRow, addBubble };
}
