// TALK: the discussion beat. His teacher's actual prescription was "lots of
// discussion about the text in English" — this is that, with a patient partner
// who is always available and never sighs.
//
// It grades COMPREHENSION, not correctness of English. He is answering in his
// second language about something he just read; if he understood the text, that
// counts, however mangled the sentence. English gets at most one gentle nudge,
// and never at the cost of the answer being acknowledged first.

import { callClaudeJSON, MODEL_FAST } from './claude.js';

export function systemPrompt({ chapter, question, spoken }) {
  return [
    'You are a warm reading partner for a 10-year-old boy (German first language) learning English.',
    'He has just read a short chapter and you are talking with him about it.',
    '',
    `CHAPTER TEXT:\n${(chapter.steps ?? []).map((s) => s.text).join(' ').slice(0, 2000)}`,
    '',
    `YOUR QUESTION WAS: ${question.q}`,
    `Things a good answer touches on: ${(question.expect ?? []).join(', ')}.`,
    '',
    'Grade UNDERSTANDING, not grammar. Broken English that shows he understood is a good answer.',
    'score 0-100: did he grasp what the question asked about? 70+ means yes.',
    spoken
      ? 'His answer came from SPEECH RECOGNITION, so odd words are likely mis-hearings, not mistakes. '
        + 'Never correct spelling or a word that looks like a transcription slip. If the answer is '
        + 'unintelligible, set score to null rather than guessing.'
      : 'His answer was typed, so spelling is his own.',
    '',
    'reply: 1-2 short warm sentences reacting to what he SAID — like a friend who read the same book,',
    'not a teacher marking work. React to the content. If he missed the point, do not tell him the',
    'answer: ask one easier question that walks him back to it. Simple English a 10-year-old follows.',
    'No markdown, no lists, no emoji.',
    '',
    'nudge: null most of the time. At most ONE short English correction, and only when it is worth',
    'interrupting the conversation for — a mistake he makes repeatedly, not a one-off slip. Show the',
    'better phrasing rather than naming a rule. Never correct and question in the same turn.',
    '',
    'Reply with ONE JSON object and nothing else:',
    '{"score":0-100 or null,"reply":"...","nudge":null or "...","followUp":false}',
    'followUp is true when your reply ends in a question he should answer.',
  ].join('\n');
}

export async function gradeAnswer({ chapter, question, answer, spoken = false, apiKey }) {
  const raw = await callClaudeJSON({
    apiKey,
    model: MODEL_FAST,
    maxTokens: 300,
    system: systemPrompt({ chapter, question, spoken }),
    messages: [{ role: 'user', content: String(answer).slice(0, 800) }],
  });
  return {
    score: typeof raw.score === 'number' ? Math.max(0, Math.min(100, Math.round(raw.score))) : null,
    reply: typeof raw.reply === 'string' ? raw.reply.trim() : 'Interesting!',
    nudge: typeof raw.nudge === 'string' && raw.nudge.trim() ? raw.nudge.trim() : null,
    followUp: !!raw.followUp,
  };
}

// The chapter's talkScore for the difficulty controller: the mean of the graded
// answers. Unintelligible answers (score null) are dropped rather than counted
// as zero — a speech-recognition failure is not a comprehension failure, and
// treating it as one would drag the difficulty band down for the wrong reason.
export function talkScore(results) {
  const scored = results.map((r) => r?.score).filter((s) => typeof s === 'number');
  if (!scored.length) return null;
  return Math.round(scored.reduce((a, b) => a + b, 0) / scored.length);
}
