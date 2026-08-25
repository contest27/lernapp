// Word lookup for the READ beat.
//
// The language decision was: English throughout, German only when he taps a
// word, never volunteered. That makes tapping both the safety net and the app's
// single best difficulty signal — he taps exactly when he does not know a word,
// which is why level.js steers on gloss rate.
//
// Three tiers, cheapest first: the chapter's own glossary (offline, vetted),
// then the cache (offline, previously looked up), then a live call. Every live
// result is cached forever, so the same word is free the second time.

import { callClaudeJSON, MODEL_FAST } from './claude.js';
import { aiReady } from '../../qa/endpoint.js';
import { normalise } from '../engine/vocab.js';

export function systemPrompt() {
  return [
    'A 10-year-old German boy reading an English story taps one word he does not know.',
    'Give the meaning of that word AS IT IS USED IN THE SENTENCE he was given — not its other meanings.',
    'de: the German word or short phrase. Just the meaning, no article unless it is a noun.',
    'en: a very simple English paraphrase, at most 8 words, using words easier than the one he tapped.',
    'Never explain the whole sentence. Never mention grammar. Never add encouragement.',
    'Reply with ONE JSON object and nothing else: {"de":"...","en":"..."}',
  ].join('\n');
}

// Returns { de, en, source } — source is 'chapter' | 'cache' | 'live' | 'none'.
// Never throws: a failed lookup shows the word with an apology, and the gloss
// tap is still recorded, because not knowing the word is the fact we care about.
export async function lookup({ word, sentence, chapter, state, apiKey }) {
  const w = normalise(word);
  if (!w) return { de: null, en: null, source: 'none' };

  const fromChapter = chapter?.glossary?.[w];
  if (fromChapter) return { ...fromChapter, source: 'chapter' };

  const cached = state.glossCache?.[w];
  if (cached) return { ...cached, source: 'cache' };

  // aiReady, not the bare key: on the Cloudflare build the key is the
  // server's and this device has none (../../qa/endpoint.js).
  if (!aiReady(apiKey)) return { de: null, en: null, source: 'none' };

  try {
    const raw = await callClaudeJSON({
      apiKey,
      model: MODEL_FAST,
      maxTokens: 120,
      system: systemPrompt(),
      messages: [{ role: 'user', content: `Word: ${word}\nSentence: ${sentence ?? ''}` }],
    });
    const out = {
      de: typeof raw.de === 'string' ? raw.de.trim() : null,
      en: typeof raw.en === 'string' ? raw.en.trim() : null,
    };
    if (out.de || out.en) {
      state.glossCache = state.glossCache ?? {};
      state.glossCache[w] = out;
    }
    return { ...out, source: 'live' };
  } catch {
    return { de: null, en: null, source: 'none' };
  }
}
