// Chapter narration playback.
//
// Pre-rendered edge-tts MP3s (real en-GB neural voices) are strongly preferred
// over the device's Web Speech voice: natural prosody matters a great deal to a
// language learner, and the stamped durationSec lets the sentence highlight
// track the audio. Web Speech is only the fallback for a chapter that has not
// been narrated yet.
//
// MP3s are runtime-cached by the service worker into MEDIA_CACHE, which survives
// CACHE_VERSION bumps. They must never be precached — see the SW comment.

import * as tts from '../../tts.js'; // shared shell tts, not an English-owned copy

let current = null;

export function stop() {
  if (current?.el) { current.el.pause(); current.el.src = ''; }
  current = null;
  tts.stop();
}

export function mediaPath(arcId, audio) {
  return `./data/story/${arcId}/${audio}`;
}

// Resolves when playback ends (or fails). Never rejects: a missing MP3 must
// degrade to the synthetic voice, not interrupt his reading.
export function play(arcId, step, { voiceURI = null, rate = 0.95 } = {}) {
  stop();
  return new Promise((resolve) => {
    if (!step?.audio) return speakFallback(step, voiceURI, rate, resolve);

    const el = new Audio(mediaPath(arcId, step.audio));
    current = { el };
    const done = () => { if (current?.el === el) current = null; resolve(); };
    el.onended = done;
    el.onerror = () => { if (current?.el === el) current = null; speakFallback(step, voiceURI, rate, resolve); };
    el.play().catch(() => {
      // Autoplay refusal on iOS: only happens outside a user gesture, and every
      // call site here is behind a tap. Fall back rather than sit silent.
      if (current?.el === el) current = null;
      speakFallback(step, voiceURI, rate, resolve);
    });
  });
}

function speakFallback(step, voiceURI, rate, resolve) {
  if (!step?.text || !tts.available()) return resolve();
  tts.speak(step.text, { rate, voiceURI, lang: 'en', onend: resolve });
}

export function playing() {
  return !!current || tts.speaking();
}
