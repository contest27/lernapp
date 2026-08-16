// Guided explanation: the step model and the practice gate.
//
// A new topic is walked through one part at a time — each explanation segment,
// then the worked example, then a check-in ("did you understand, or shall I
// translate something?"). Practice only unlocks once the check-in is answered,
// so the lesson can no longer be skipped with a single tap.
//
// Pure: no DOM, no store. The step position lives on the session object as
// `segIdx` (a field both session builders already wrote but nothing read), so
// it persists with the session and a closed tab resumes mid-explanation.

// Three steps: the explanation in two halves, then the check-in. Few enough
// not to feel like a slide show, but still paced — and the gate at the end is
// what actually stops the lesson being skipped. The worked example rides along
// with the second half.
export function lessonSteps(topic) {
  const segs = topic.explanation?.segments ?? [];
  const half = Math.ceil(segs.length / 2);
  const indices = segs.map((_, i) => i);
  const steps = [indices.slice(0, half), indices.slice(half)]
    .filter((group) => group.length)
    .map((group) => ({ kind: 'part', segs: group, example: false }));
  if (topic.example) {
    if (steps.length) steps[steps.length - 1].example = true;
    else steps.push({ kind: 'part', segs: [], example: true });
  }
  steps.push({ kind: 'checkin' });
  return steps;
}

export function stepCount(topic) {
  return lessonSteps(topic).length;
}

// Clamped on read: a session persisted against different content (or a stray
// value) can never point past the end and strand the child.
export function stepIndex(s, topic) {
  const last = stepCount(topic) - 1;
  return Math.min(Math.max(s.segIdx ?? 0, 0), last);
}

export function currentStep(s, topic) {
  return lessonSteps(topic)[stepIndex(s, topic)];
}

export function advanceStep(s, topic) {
  s.segIdx = Math.min(stepIndex(s, topic) + 1, stepCount(topic) - 1);
  return s.segIdx;
}

export function backStep(s, topic) {
  s.segIdx = Math.max(stepIndex(s, topic) - 1, 0);
  return s.segIdx;
}

export function isLastStep(s, topic) {
  return stepIndex(s, topic) === stepCount(topic) - 1;
}

// The gate. Both check-in answers unlock practice — asking for a translation
// must never lock a child out.
export function canPractise(s) {
  return s.checkedIn === true;
}

export function markCheckedIn(s) {
  s.checkedIn = true;
  return s;
}
