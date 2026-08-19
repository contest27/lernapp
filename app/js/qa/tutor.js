// Browser-direct call to the Anthropic Messages API ("bring your own key").
// The key lives only in this device's localStorage; backups strip it.

import { postMessages } from './endpoint.js';

const MODEL = 'claude-haiku-4-5';

function systemPrompt(topic) {
  const notes = (topic.explanation?.segments ?? [])
    .map((s) => s.text.replace(/<[^>]*>/g, ''))
    .join(' ')
    .slice(0, 900);
  return [
    'You are a kind, patient maths tutor for a child in Year 6 (age 10-11) at a school using the UK Power Maths curriculum.',
    `Current topic: ${topic.title}. Lesson notes: ${notes}`,
    'Rules:',
    '- Answer only questions about maths. If asked about anything else, say one friendly sentence steering back to maths.',
    '- Keep answers under 90 words, in simple, warm language a 10-year-old understands.',
    '- Use the same methods as the lesson: place value, bar models, column method with exchange, long multiplication, short and long division, order of operations.',
    '- Give one small example where it helps. Never just state a rule without a why.',
    '- Plain sentences only: no markdown, no headings, no lists.',
  ].join('\n');
}

// System prompt for the global buddy: general helper that stays kid-friendly and
// steers back to maths. When a practice question is on screen, it gets the stem
// (never the answer) and is told to guide, not solve. Pure + exported for tests.
export function buddySystemPrompt(ctx = {}) {
  const bits = [
    'You are "Buddy", a warm, encouraging helper for a child in Year 6 (age 10-11) using a UK Power Maths practice app.',
    'Rules:',
    '- You mainly help with maths. You may answer one short friendly side question, then gently steer back to maths.',
    '- Keep answers under 90 words, in simple, warm language a 10-year-old understands. Plain sentences only: no markdown, no headings, no lists.',
    '- Use the school\'s methods: place value, bar models, column method with exchange, long multiplication, long division. Give one small example where it helps.',
    '- When helping with the question on screen, GUIDE with a hint or the first step and a question back — do not just give the final answer.',
  ];
  if (ctx.topicName) bits.push(`The child is currently on the topic: ${ctx.topicName}.`);
  if (ctx.stem) bits.push(`The question on their screen is: "${ctx.stem}". Help them think it through; do not simply give the answer.`);
  return bits.join('\n');
}

// System prompt for ONE tapped word. The child learns maths in English but his
// German is much stronger, so a full German translation lets him skip the
// English altogether — the help therefore stops at the word. This prompt is the
// last line of that rule: a single word, in its sentence, and nothing else.
// It replaced the earlier whole-lesson and whole-question translators.
// Pure + exported for tests.
export function glossSystemPrompt() {
  return [
    'Du hilfst einem 10-jährigen Kind, das in England Mathe auf Englisch lernt (Year 6). Seine Muttersprache ist Deutsch.',
    'Du bekommst EIN englisches Wort und den Satz, in dem es vorkommt.',
    'Antworte nur mit der deutschen Bedeutung dieses einen Wortes in genau diesem Satz.',
    'Regeln:',
    '- Höchstens 12 Wörter. Kein ganzer Satz, keine Erklärung, keine Aufzählung, kein Markdown.',
    '- Übersetze NUR dieses eine Wort. Übersetze niemals den ganzen Satz.',
    '- Rechne NIEMALS. Nenne kein Ergebnis, keinen Rechenweg, keinen ersten Schritt und keinen Tipp.',
    '- Bei einem Fachbegriff: deutscher Begriff, dahinter das englische Wort in Klammern, zum Beispiel "der Rest (remainder)".',
  ].join('\n');
}

// The Messages API request body. Pure + exported so the system override and the
// haiku/max_tokens defaults are unit-testable without a fetch.
export function buildRequestBody({ question, topic, system = null, streaming }) {
  return {
    model: MODEL,
    max_tokens: 300,
    stream: streaming,
    system: system ?? systemPrompt(topic),
    messages: [{ role: 'user', content: question }],
  };
}

// Errors carry: kind ('offline' | 'blocked' | 'http' | 'bad-response'),
// status (HTTP code) and detail (the API's own message) so the parent corner
// can show exactly what went wrong instead of a vague catch-all.
export class TutorError extends Error {
  constructor(kind, { status = null, detail = '' } = {}) {
    super(`${kind}${status ? ' ' + status : ''}${detail ? ': ' + detail : ''}`);
    this.kind = kind;
    this.status = status;
    this.detail = detail;
    this.offline = kind === 'offline' || kind === 'blocked';
  }
}

// Pull every complete SSE event out of `buffer`. Events are separated by a
// blank line; only `data:` lines carry JSON. Returns the parsed events plus
// the leftover `rest` (a half-received event that spans reader chunks).
// Pure and exported so the tests can feed it split buffers.
export function drainSSE(buffer) {
  const events = [];
  let sep;
  while ((sep = buffer.indexOf('\n\n')) !== -1) {
    const chunk = buffer.slice(0, sep);
    buffer = buffer.slice(sep + 2);
    for (const line of chunk.split('\n')) {
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;
      try { events.push(JSON.parse(payload)); } catch { /* skip malformed chunk */ }
    }
  }
  return { events, rest: buffer };
}

// The incremental text of a streamed event, or null for anything else.
export function textDelta(ev) {
  return ev && ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta'
    ? ev.delta.text
    : null;
}

const FALLBACK_ANSWER = 'I am not sure about that one — ask a parent!';

export async function askTutor({ question, topic, apiKey, onText = null, system = null }) {
  // Deliberately NOT gated on navigator.onLine. That flag is unreliable —
  // installed iOS web apps can report false while the network works fine —
  // so refusing to try would strand a perfectly good setup. Always attempt
  // the request; the flag is only used to word a failure afterwards.

  const streaming = typeof onText === 'function';

  // Built outside the try: a bug here must not masquerade as a network failure.
  // A caller-supplied `system` (the buddy) wins over the topic tutor prompt.
  const body = JSON.stringify(buildRequestBody({ question, topic, system, streaming }));

  let res;
  try {
    // Server proxy where one exists, browser-direct with the device key where
    // it does not — see qa/endpoint.js.
    res = await postMessages(body, { apiKey });
  } catch (e) {
    // Fetch only throws for transport-level failures: no connection, DNS
    // failure, or a content blocker / firewall dropping the request.
    throw new TutorError(navigator.onLine ? 'blocked' : 'offline', {
      detail: String(e && e.message || e),
    });
  }

  // A bad key, billing problem, etc. surfaces here — before any stream — as a
  // non-ok status with a JSON error body, exactly as in the non-streaming path.
  if (!res.ok) {
    let detail = '';
    try {
      const err = await res.json();
      detail = err?.error?.message || '';
    } catch {
      detail = (await res.text().catch(() => '')).slice(0, 200);
    }
    throw new TutorError('http', { status: res.status, detail });
  }

  if (!streaming) {
    const data = await res.json();
    const text = (data.content ?? [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join(' ')
      .trim();
    return text || FALLBACK_ANSWER;
  }

  // Streaming: read the SSE body, hand each text fragment to onText, and
  // accumulate the full answer to return once the stream ends.
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const { events, rest } = drainSSE(buffer);
    buffer = rest;
    for (const ev of events) {
      const piece = textDelta(ev);
      if (piece != null) { full += piece; onText(piece); continue; }
      if (ev.type === 'error') {
        throw new TutorError('http', { status: ev.error?.status ?? null, detail: ev.error?.message || 'stream error' });
      }
      if (ev.type === 'message_delta' && ev.delta?.stop_reason === 'refusal') {
        throw new TutorError('bad-response', { detail: 'refused' });
      }
    }
  }
  return full.trim() || FALLBACK_ANSWER;
}

// Used by the parent corner to validate a freshly entered key.
export async function testKey(apiKey) {
  const fake = { title: 'a quick check', explanation: { segments: [] } };
  return askTutor({ question: 'Say the single word: ready', topic: fake, apiKey });
}
