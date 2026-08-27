// Which build this is. One string, imported by anything that has to notice a
// deploy at runtime.
//
// WHY IT EXISTS (2026-08-27). A session is built once and then persisted whole:
// buildSession() generates every question up front and stores the finished
// items — prompt text AND the rendered SVG — in slice.activeSession, which
// goes to localStorage. startOrResume() picks that session up again for the
// rest of the day. So a session built in the morning keeps its questions
// exactly as they were, and a content fix deployed at lunchtime cannot reach
// it: on the device, two ambiguous-digit questions and an unreadable number
// line survived the fix, the deploy and two full restarts, because they were
// already sitting in the store.
//
// A session from an older build is therefore discarded rather than resumed.
// Losing a half-finished session on the day of a deploy is the cheaper mistake:
// the questions in it are the ones we just fixed.
//
// MUST equal CACHE_VERSION in app/sw.js — the two mark the same thing, and the
// test suite fails if they drift apart. Bump both on every deploy.
export const BUILD = 'lernapp-v15';
