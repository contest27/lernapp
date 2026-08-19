// Speech recognition, wrapped so the rest of the app never has to care whether
// it works. On iPad Safari this is webkitSpeechRecognition: available since
// iOS 14.5, but it needs Siri enabled, routes audio to Apple's servers (so it
// is online-only), and `continuous` / `interimResults` are documented as
// unreliable on WebKit.
//
// Every caller therefore gets a typing fallback for free. The design decision
// was mixed input from the start: TALK is spoken because pronunciation and
// fluency matter there, CREATE is typed because spelling and word retrieval are
// a genuine EAL weakness. Either falls back to the other rather than blocking.

const SR = typeof window !== 'undefined'
  ? (window.SpeechRecognition || window.webkitSpeechRecognition)
  : null;

export function available() {
  return !!SR && (typeof window === 'undefined' || window.isSecureContext !== false);
}

// Reasons recognition can refuse, worded for a parent rather than a developer.
export const REASONS = {
  'not-allowed': 'Microphone access is off. Check Settings → Safari → Microphone.',
  'service-not-allowed': 'Dictation is switched off. Turn on Siri or Dictation in Settings.',
  'network': 'Speech needs an internet connection.',
  'no-speech': 'I did not hear anything.',
  'aborted': '',
  'audio-capture': 'No microphone found.',
};

// listen({ lang, onInterim }) -> { promise, stop(), abort() }
// The promise resolves with the final transcript ('' if nothing was heard) and
// rejects only for genuine faults, never for silence — a child who says nothing
// should get the typing box, not an error.
export function listen({ lang = 'en-GB', onInterim = null, maxMs = 15000 } = {}) {
  if (!available()) {
    return { promise: Promise.reject(new Error('unsupported')), stop() {}, abort() {} };
  }

  const rec = new SR();
  rec.lang = lang;
  rec.interimResults = true;
  rec.continuous = false;
  rec.maxAlternatives = 3;

  let final = '';
  let settled = false;
  let timer = null;

  const promise = new Promise((resolve, reject) => {
    const done = (fn, v) => { if (!settled) { settled = true; clearTimeout(timer); fn(v); } };

    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) final += r[0].transcript + ' ';
        else interim += r[0].transcript;
      }
      if (onInterim) onInterim((final + interim).trim());
    };

    rec.onerror = (e) => {
      // Silence and a user-initiated stop are normal outcomes, not failures.
      if (e.error === 'no-speech' || e.error === 'aborted') return done(resolve, final.trim());
      const err = new Error(e.error);
      err.reason = REASONS[e.error] ?? 'Speech is not working right now.';
      done(reject, err);
    };

    rec.onend = () => done(resolve, final.trim());

    timer = setTimeout(() => { try { rec.stop(); } catch { /* already stopped */ } }, maxMs);

    try {
      rec.start();
    } catch (e) {
      // start() throws if called twice, or outside a user gesture on iOS.
      const err = new Error('start-failed');
      err.reason = 'Tap the microphone button to start talking.';
      done(reject, err);
    }
  });

  return {
    promise,
    stop() { try { rec.stop(); } catch { /* ignore */ } },
    abort() { try { rec.abort(); } catch { /* ignore */ } },
  };
}
