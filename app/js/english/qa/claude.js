// Browser-direct call to the Anthropic Messages API ("bring your own key").
// Transport inherited from PowerMath Trainer's qa/tutor.js: same SSE draining,
// same error taxonomy, same refusal to gate on navigator.onLine.
//
// The key lives only in this device's localStorage; backups strip it.

import { postMessages } from '../../qa/endpoint.js';


// Talk grading is high-volume and mechanical — Haiku is the right tier.
// The genie both judges his English and emits a structured scene, which is the
// heart of the experience, so it gets the stronger model.
export const MODEL_FAST = 'claude-haiku-4-5';
export const MODEL_GENIE = 'claude-sonnet-5';

export class ClaudeError extends Error {
  constructor(kind, { status = null, detail = '' } = {}) {
    super(`${kind}${status ? ' ' + status : ''}${detail ? ': ' + detail : ''}`);
    this.kind = kind;          // 'offline' | 'blocked' | 'http' | 'bad-response'
    this.status = status;
    this.detail = detail;
    this.offline = kind === 'offline' || kind === 'blocked';
  }
}

// Pull every complete SSE event out of `buffer`. Events are separated by a
// blank line; only `data:` lines carry JSON. Returns the parsed events plus the
// leftover `rest` (a half-received event that spans reader chunks).
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

export function textDelta(ev) {
  return ev && ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta'
    ? ev.delta.text
    : null;
}

export function buildBody({ system, messages, model = MODEL_FAST, maxTokens = 400, streaming = false, prefill = null }) {
  const msgs = prefill ? [...messages, { role: 'assistant', content: prefill }] : messages;
  return { model, max_tokens: maxTokens, stream: streaming, system, messages: msgs };
}

export async function callClaude({ system, messages, apiKey, model, maxTokens, onText = null, prefill = null }) {
  const streaming = typeof onText === 'function';
  // Built outside the try so a bug here cannot masquerade as a network failure.
  const body = JSON.stringify(buildBody({ system, messages, model, maxTokens, streaming, prefill }));

  let res;
  try {
    // Server proxy where one exists, browser-direct with the device key where
    // it does not — see ../../qa/endpoint.js.
    res = await postMessages(body, { apiKey });
  } catch (e) {
    // fetch only throws for transport-level failure: no connection, DNS, or a
    // content blocker dropping the request. navigator.onLine is unreliable in
    // installed iOS web apps, so it only words the failure — never gates it.
    throw new ClaudeError(navigator.onLine ? 'blocked' : 'offline', { detail: String(e && e.message || e) });
  }

  if (!res.ok) {
    let detail = '';
    try { detail = (await res.json())?.error?.message || ''; }
    catch { detail = (await res.text().catch(() => '')).slice(0, 200); }
    throw new ClaudeError('http', { status: res.status, detail });
  }

  if (!streaming) {
    const data = await res.json();
    return (data.content ?? []).filter((b) => b.type === 'text').map((b) => b.text).join(' ').trim();
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '', full = '';
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
        throw new ClaudeError('http', { status: ev.error?.status ?? null, detail: ev.error?.message || 'stream error' });
      }
      if (ev.type === 'message_delta' && ev.delta?.stop_reason === 'refusal') {
        throw new ClaudeError('bad-response', { detail: 'refused' });
      }
    }
  }
  return full.trim();
}

// Extract a JSON object from a model reply. The caller prefills the assistant
// turn with "{", which forces the response to start inside the object, so the
// prefix is prepended back before parsing. Fenced output and trailing prose are
// tolerated because a single malformed reply must not break his session.
export function parseJSON(text, prefix = '{') {
  const raw = (prefix + text).trim();
  const candidates = [raw];
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) candidates.unshift(fence[1]);
  const brace = raw.indexOf('{');
  const close = raw.lastIndexOf('}');
  if (brace !== -1 && close > brace) candidates.push(raw.slice(brace, close + 1));

  for (const c of candidates) {
    try { const o = JSON.parse(c); if (o && typeof o === 'object') return o; } catch { /* next */ }
  }
  throw new ClaudeError('bad-response', { detail: 'could not parse JSON: ' + raw.slice(0, 200) });
}

export async function callClaudeJSON(opts) {
  const text = await callClaude({ ...opts, prefill: '{' });
  return parseJSON(text);
}

// Used by the parent corner to validate a freshly entered key.
export async function testKey(apiKey) {
  return callClaude({
    apiKey,
    system: 'Reply with exactly one word.',
    messages: [{ role: 'user', content: 'Say the single word: ready' }],
    maxTokens: 16,
  });
}
