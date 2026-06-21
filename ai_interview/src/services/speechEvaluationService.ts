/**
 * SpeechEvaluationService v2 — Accurate NLP scoring
 *
 * FIXED: Score starts at 0. Filler answers like "ok so" score 5/100.
 * Repeating question words back gives zero credit.
 * Only substantive, meaningful content raises the score.
 */

export interface AnswerRecord {
  questionId: string;
  questionText: string;
  difficulty: 'easy' | 'medium' | 'hard';
  transcript: string;
  timestamp: string;
}

export interface QuestionEvalResult {
  questionId: string;
  questionText: string;
  difficulty: 'easy' | 'medium' | 'hard';
  transcript: string;
  score: number;
  verdict: 'Correct' | 'Partially Correct' | 'Incorrect' | 'No Answer';
  keywords: string[];
  missingKeywords: string[];
  feedback: string;
}

export interface EvaluationReport {
  totalScore: number;
  maxScore: number;
  percentage: number;
  recommendation: 'Strong Hire' | 'Consider' | 'Review Required' | 'Not Recommended';
  questionResults: QuestionEvalResult[];
  strengths: string[];
  improvements: string[];
}

const ANSWERS_KEY = 'intellirecruit_answers';

export function saveAnswer(record: AnswerRecord): void {
  try {
    const existing = loadAnswers();
    const filtered = existing.filter(a => a.questionId !== record.questionId);
    sessionStorage.setItem(ANSWERS_KEY, JSON.stringify([...filtered, record]));
  } catch (e) { console.error('[Eval] save failed:', e); }
}

export function loadAnswers(): AnswerRecord[] {
  try { const r = sessionStorage.getItem(ANSWERS_KEY); return r ? JSON.parse(r) : []; }
  catch { return []; }
}

export function clearAnswers(): void { sessionStorage.removeItem(ANSWERS_KEY); }

// ── Noise word set: fillers + stop words + question-prompt verbs ──────────────
// ANY word in this set gives ZERO credit toward the answer score.
const NOISE = new Set([
  'ok','okay','so','um','uh','yeah','yep','nope','hmm','ah','oh',
  'well','like','right','sure','fine','good','yes','no','maybe',
  'just','sort','kind','stuff','thing','things','know','mean',
  'basically','actually','literally','honestly','totally','definitely',
  'hi','hello','hey','bye','thanks','thank','please','sorry','wait',
  'let','get','got','make','put','say','tell','see','think','go',
  'come','give','take','use','want','need','have','try',
  // Question prompt words — repeating them earns no credit
  'walk','explain','describe','list','name','define','compare',
  'discuss','elaborate','mention','show','provide','identify',
  'outline','summarize','write','consider','evaluate','analyze',
  // Standard stop words
  'a','an','the','is','are','was','were','be','been','being',
  'has','had','do','does','did','will','would','could','should',
  'may','might','shall','can',
  'what','which','who','where','when','why','how',
  'i','you','he','she','it','we','they','me','him','her','us','them',
  'my','your','his','its','our','their','this','that','these','those',
  'in','on','at','by','for','with','about','between','into',
  'through','before','after','to','from','up','down','out','off',
  'or','and','but','nor','yet','not','very','really','too','also',
  'one','two','three','four','five','first','second','main','most',
  'more','less','many','much','some','any','all','each','every',
  'of','as','than','such','only','however','even','then','here','there',
  'if','both','either','neither','same','different','new','old',
]);

// Extract words that contribute meaningfully to an answer
function meaningful(text: string): string[] {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !NOISE.has(w));
}

// Extract expected keywords FROM the question (same filter)
function keywords(q: string): string[] {
  return [...new Set(meaningful(q))];
}

// ── Core scoring — starts at 0, earned by real content only ──────────────────
function scoreAnswer(
  questionText: string,
  transcript: string,
  difficulty: 'easy' | 'medium' | 'hard',
): { score: number; keywords: string[]; missingKeywords: string[]; feedback: string } {
  const t = transcript.toLowerCase().trim();
  const expected = keywords(questionText);

  if (!t || t.length < 2) {
    return { score: 0, keywords: [], missingKeywords: expected.slice(0, 6),
      feedback: 'No spoken answer was captured.' };
  }

  const mw = meaningful(t);

  // Filler-only answers ("ok so", "yeah um", "sure") → max 5
  if (mw.length === 0) {
    return { score: 5, keywords: [], missingKeywords: expected.slice(0, 6),
      feedback: 'Answer contained only filler words. Please provide a substantive technical response.' };
  }

  // Too few meaningful words (1-2) → cap at 10
  if (mw.length < 3) {
    return { score: Math.min(10, mw.length * 3), keywords: [],
      missingKeywords: expected.slice(0, 6),
      feedback: `Only ${mw.length} meaningful word(s). A proper answer needs detailed explanation.` };
  }

  // Match expected keywords against MEANINGFUL answer words only
  const mwSet = new Set(mw);
  const found = expected.filter(kw =>
    mwSet.has(kw) || mwSet.has(kw.replace(/ing$/, '')) ||
    mwSet.has(kw.replace(/s$/, '')) || mwSet.has(kw + 's') ||
    mwSet.has(kw + 'ing') || mwSet.has(kw + 'ed')
  );
  const missing = expected.filter(kw => !found.includes(kw));

  // Component 1: keyword coverage — 0 to 50 pts
  const kwPts = expected.length > 0 ? Math.round((found.length / expected.length) * 50) : 10;

  // Component 2: depth (meaningful word count) — 0 to 30 pts
  const minMW = difficulty === 'easy' ? 10 : difficulty === 'medium' ? 18 : 30;
  const depthPts = Math.round(Math.min(30, (mw.length / minMW) * 30));

  // Component 3: reasoning / coherence — 0 or 15 pts
  const coherencePts = /because|therefore|which means|for example|such as|however|although|this means|in order|as a result|furthermore|additionally|specifically|consequently/.test(t) ? 15 : 0;

  // Component 4: vocabulary richness — 0 to 5 pts
  const richPts = new Set(mw).size >= 6 ? 5 : new Set(mw).size >= 4 ? 2 : 0;

  const score = Math.min(100, Math.max(0, kwPts + depthPts + coherencePts + richPts));

  const feedback = score >= 80
    ? 'Excellent — comprehensive, relevant, and well-structured answer.'
    : score >= 65 ? `Good. Could elaborate on: ${missing.slice(0, 2).join(', ') || 'more detail'}.`
    : score >= 35 ? `Partial. Key areas missed: ${missing.slice(0, 3).join(', ') || 'core concepts'}.`
    : score >= 15 ? `Insufficient. Much more depth needed. Cover: ${expected.slice(0, 4).join(', ')}.`
    : `Not meaningful. Provide a complete response covering: ${expected.slice(0, 4).join(', ')}.`;

  return { score, keywords: found, missingKeywords: missing.slice(0, 5), feedback };
}

export function evaluateAll(answers: AnswerRecord[]): EvaluationReport {
  if (!answers.length) {
    return { totalScore: 0, maxScore: 500, percentage: 0,
      recommendation: 'Review Required', questionResults: [],
      strengths: [], improvements: ['No answers to evaluate'] };
  }

  const results: QuestionEvalResult[] = answers.map(a => {
    const { score, keywords: kw, missingKeywords, feedback } = scoreAnswer(a.questionText, a.transcript, a.difficulty);
    const hasMeaning = meaningful(a.transcript).length > 0;
    const verdict: QuestionEvalResult['verdict'] =
      !a.transcript || a.transcript.trim().length < 2 || !hasMeaning ? 'No Answer' :
      score >= 70 ? 'Correct' : score >= 35 ? 'Partially Correct' : 'Incorrect';
    return { questionId: a.questionId, questionText: a.questionText, difficulty: a.difficulty,
      transcript: a.transcript, score, verdict, keywords: kw, missingKeywords, feedback };
  });

  const total = results.reduce((s, r) => s + r.score, 0);
  const max   = answers.length * 100;
  const pct   = Math.round((total / max) * 100);
  const reco: EvaluationReport['recommendation'] =
    pct >= 78 ? 'Strong Hire' : pct >= 60 ? 'Consider' :
    pct >= 42 ? 'Review Required' : 'Not Recommended';

  const strengths: string[] = [];
  const improvements: string[] = [];
  const correct = results.filter(r => r.verdict === 'Correct').length;
  const noAns   = results.filter(r => r.verdict === 'No Answer').length;
  const avgMW   = answers.reduce((s, a) => s + meaningful(a.transcript).length, 0) / answers.length;

  if (correct >= 3) strengths.push(`Answered ${correct}/${answers.length} questions correctly`);
  if (avgMW > 20)  strengths.push('Provided detailed, substantive explanations');
  if (results.some(r => r.difficulty === 'hard' && r.score >= 65)) strengths.push('Handled advanced questions well');
  if (correct > 0) strengths.push('Demonstrated relevant technical knowledge');

  if (noAns > 0)   improvements.push(`${noAns} question(s) had no meaningful answer`);
  if (avgMW < 8)   improvements.push('Answers too brief — elaborate with examples and reasoning');
  const allMiss = [...new Set(results.flatMap(r => r.missingKeywords))].slice(0, 4);
  if (allMiss.length) improvements.push(`Review: ${allMiss.join(', ')}`);
  if (results.some(r => r.difficulty === 'hard' && r.score < 50)) {
    improvements.push('Work on advanced system design and architecture concepts');
  }

  return { totalScore: total, maxScore: max, percentage: pct, recommendation: reco,
    questionResults: results, strengths, improvements };
}
