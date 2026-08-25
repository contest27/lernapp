// Speech input for the TALK beat: our own recording, transcribed by Gemini.
//
// WHY NOT THE DEVICE'S DICTATION. Apple's dictation silently corrects what it
// hears to the nearest plausible word. For a ten-year-old answering in his
// second language that is the worst possible behaviour: the one thing worth
// hearing — what he actually said — is repaired away before it reaches the
// grader. On top of that, webkitSpeechRecognition needs Siri switched on and
// is documented as unreliable in an installed PWA, which is exactly how he
// uses the app. ui/speech.js stays as the fallback; this is the main road.
//
// The Gemini prompt therefore asks for a VERBATIM transcript and forbids
// correcting grammar or pronunciation.
//
// Ported from Facharzttrainer app/js/ui/stt.js (in service there since
// 2026-08-16), with its WAV writer from that app's ui/tts.js. Changes here:
// English copy and prompt, a 60 s cap instead of 90 (an answer to a
// comprehension question is short), the app's own h()/toast(), and a relative
// './api/stt' like the rest of this app. Fixes belong in both places.
//
// The key lives on the server (functions/api/stt.js, Pages secret
// GEMINI_API_KEY); nothing here ever sees it.

import { h, toast } from '../../shell/core.js';
import { sttReady } from '../../qa/endpoint.js';

const STT_URL = './api/stt';
export const MAX_SECONDS = 60;
const TARGET_RATE = 16000;
const ATTEMPTS = 3;              // Gemini answers 503 under load often enough to matter

function wait(ms, signal) {
  return new Promise((res, rej) => {
    const t = setTimeout(res, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(t);
      rej(new DOMException('aborted', 'AbortError'));
    }, { once: true });
  });
}

// Can this device record at all? (iPadOS: yes in the installed app since
// 14.3 — but it asks for the microphone once PER SESSION, so a permission
// dialog on every launch is normal, not a fault.)
export function recordingAvailable() {
  return Boolean(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);
}

// Float32 samples [-1,1] -> little-endian Int16 PCM, which is what WAV wants.
// Pure and exported for the tests.
export function float32ToInt16(f32) {
  const out = new Uint8Array(f32.length * 2);
  const v = new DataView(out.buffer);
  for (let i = 0; i < f32.length; i += 1) {
    const s = Math.max(-1, Math.min(1, f32[i]));
    v.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  return out;
}

// 44-byte canonical WAV header + the PCM payload. Pure and exported.
export function pcmToWavBlob(pcm, rate = TARGET_RATE, channels = 1, bits = 16) {
  const blockAlign = channels * (bits / 8);
  const v = new DataView(new ArrayBuffer(44));
  const tag = (off, s) => { for (let i = 0; i < s.length; i += 1) v.setUint8(off + i, s.charCodeAt(i)); };
  tag(0, 'RIFF'); v.setUint32(4, 36 + pcm.byteLength, true);
  tag(8, 'WAVE'); tag(12, 'fmt ');
  v.setUint32(16, 16, true);   // fmt chunk length (uncompressed PCM)
  v.setUint16(20, 1, true);    // format 1 = PCM
  v.setUint16(22, channels, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * blockAlign, true);
  v.setUint16(32, blockAlign, true);
  v.setUint16(34, bits, true);
  tag(36, 'data'); v.setUint32(40, pcm.byteLength, true);
  return new Blob([v.buffer, pcm], { type: 'audio/wav' });
}

// Whatever container MediaRecorder produced (iOS: audio/mp4, Chrome:
// audio/webm) -> WAV 16 kHz mono. decodeAudioData understands both, so the
// browser does the conversion and the server stays container-agnostic.
// 60 s is roughly 1.9 MB of WAV, well under Gemini's 20 MB inline limit.
export async function toWav(blob) {
  const buf = await blob.arrayBuffer();
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  let decoded;
  try { decoded = await ctx.decodeAudioData(buf); } finally { ctx.close?.(); }
  const offline = new OfflineAudioContext(1, Math.ceil(decoded.duration * TARGET_RATE), TARGET_RATE);
  const src = offline.createBufferSource();
  src.buffer = decoded;
  src.connect(offline.destination);
  src.start();
  const rendered = await offline.startRendering();
  return pcmToWavBlob(float32ToInt16(rendered.getChannelData(0)), TARGET_RATE);
}

// The whole point of not using dictation, written down for the model.
export function sttPrompt() {
  return 'Transcribe this English recording word for word. The speaker is a ten-year-old '
    + 'child who speaks English as an additional language, answering a question about a story '
    + 'he has just read. Write EXACTLY what he says: do not correct grammar, do not correct '
    + 'word order, do not tidy up pronunciation, do not translate, do not add anything. '
    + 'Return the transcript and nothing else. If nothing is said, return an empty string.';
}

// Gemini generateContent answer -> plain text. Pure and exported.
export function parseTranscript(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts || [];
  return parts.map((p) => p.text || '').join('').trim();
}

function blobToBase64(blob) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(',')[1]); // drop the data: prefix
    r.onerror = () => rej(new Error('That recording could not be read.'));
    r.readAsDataURL(blob);
  });
}

// WAV -> text, through the server proxy. Retries only what is worth retrying:
// by this point he has already spoken, and losing the recording to a passing
// 503 would cost the whole answer. A 400/404 is a configuration fault and
// repeats itself, so it is never retried.
export async function transcribe(wav, { signal } = {}) {
  const data = await blobToBase64(wav);
  const body = JSON.stringify({
    contents: [{ parts: [{ inlineData: { mimeType: 'audio/wav', data } }, { text: sttPrompt() }] }],
  });

  let res = null;
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    if (attempt > 0) await wait(700 * attempt, signal);
    try {
      res = await fetch(STT_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
        signal,
      });
    } catch (e) {
      if (e.name === 'AbortError') throw e;
      res = null;
      continue;
    }
    if (res.ok || (res.status !== 429 && res.status < 500)) break;
  }
  if (!res) throw new Error('No connection right now — you can type instead.');
  if (!res.ok) {
    if (res.status === 503) throw new Error('Speech is not set up on the server.');
    throw new Error(`Speech did not work (${res.status}) — you can type instead.`);
  }
  const text = parseTranscript(await res.json());
  if (!text) throw new Error('I did not hear anything — try again, or type it.');
  return text;
}

// Start the microphone. Resolves to { stop, abort }: stop() ends the recording
// and hands back the audio, abort() throws it away. Rejects when the
// microphone is refused — the caller shows the message.
export async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const rec = new MediaRecorder(stream);
  const chunks = [];
  rec.ondataavailable = (e) => { if (e.data?.size) chunks.push(e.data); };
  rec.start();

  const release = () => stream.getTracks().forEach((t) => t.stop());
  // Dead-man switch: a forgotten microphone stops itself, and stop() then
  // returns whatever was recorded up to that point.
  const cap = setTimeout(() => { if (rec.state === 'recording') rec.stop(); }, MAX_SECONDS * 1000);

  return {
    stop: () => new Promise((res) => {
      const done = () => {
        clearTimeout(cap);
        release();
        res(new Blob(chunks, { type: rec.mimeType || 'audio/webm' }));
      };
      if (rec.state === 'inactive') done();
      else { rec.onstop = done; rec.stop(); }
    }),
    abort: () => {
      clearTimeout(cap);
      rec.onstop = null;
      if (rec.state !== 'inactive') rec.stop();
      release();
    },
  };
}

// ---------------------------------------------------------------- the button
//
// One button, so every place that takes a spoken answer behaves identically
// and nobody writes this state machine twice. Returns null when the device
// cannot record or the server has no Gemini key — the caller then falls back
// to ui/speech.js or to plain typing.

export function micButton({ onText, status = null, label = '🎤 say it' }) {
  if (!recordingAvailable() || !sttReady()) return null;

  let rec = null;
  let seconds = 0;
  let ticker = null;

  const b = h('button', { id: 'mic', class: 'btn ghost wide', onclick: () => toggle() }, label);

  const say = (t) => { if (status) status.textContent = t; };

  function idle() {
    if (ticker) clearInterval(ticker);
    ticker = null;
    rec = null;
    b.disabled = false;
    b.classList.remove('live');
    b.textContent = label;
  }

  async function toggle() {
    if (rec) { await finish(); return; }
    try {
      rec = await startRecording();
    } catch {
      // The permission prompt comes back every session in an installed PWA, so
      // a refusal here is the ordinary case, not a broken device.
      toast('I cannot hear the microphone — allow it, or type your answer.');
      rec = null;
      return;
    }
    seconds = 0;
    b.classList.add('live');
    b.textContent = '⏹ stop · 0s';
    say('Listening — tap stop when you are done.');
    ticker = setInterval(() => {
      seconds += 1;
      if (rec) b.textContent = `⏹ stop · ${seconds}s`;
    }, 1000);
  }

  async function finish() {
    const active = rec;
    if (ticker) clearInterval(ticker);
    ticker = null;
    rec = null;
    b.disabled = true;
    b.classList.remove('live');
    b.textContent = '… hearing you';
    try {
      const raw = await active.stop();
      if (seconds < 1 && raw.size < 2000) {
        say('');
        toast('Too short — talk first, then tap stop.');
        return;
      }
      const text = await transcribe(await toWav(raw));
      onText(text);
      say('Got it — read it through before you send.');
    } catch (e) {
      say('');
      toast(e.message || 'Speech did not work — you can type instead.');
    } finally {
      idle();
    }
  }

  // Drop a running recording and release the microphone (screen change).
  b.cleanup = () => { if (rec) { rec.abort(); idle(); } };
  return b;
}
