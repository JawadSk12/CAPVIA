/**
 * deepEvaluationService.ts
 * ========================
 * Advanced AI Interview Evaluation Engine
 * Evaluates a Q&A pair across 7 expert dimensions using client-side NLP.
 *
 * Dimensions:
 *  1. Technical Correctness
 *  2. Depth of Understanding
 *  3. Logical Reasoning
 *  4. Clarity & Structure
 *  5. Communication Quality
 *  6. Confidence Level
 *  7. Problem Explanation Ability
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DimensionScore {
  name: string;
  score: number;        // 0–100
  label: string;        // "Excellent" | "Good" | "Adequate" | "Weak" | "Poor"
  detail: string;       // 1–2 sentence analysis
}

export interface DeepEvalResult {
  question: string;
  answer: string;
  overallScore: number;        // 0–100 weighted average
  overallGrade: string;        // A+ → F
  overallSummary: string;      // 2–3 sentence expert summary
  dimensions: DimensionScore[];
  strengths: string[];
  areasForImprovement: string[];
  technicalUnderstanding: string;
  logicalThinking: string;
  communicationClarity: string;
  confidenceDelivery: string;
  answerType: 'Deep' | 'Adequate' | 'Surface' | 'Memorized' | 'Vague' | 'Empty';
  wordCount: number;
  meaningfulWordCount: number;
  detectedConcepts: string[];
  missingConcepts: string[];
  evaluatedAt: string;
}

// ── Stop-word / noise set ─────────────────────────────────────────────────────

const STOP = new Set([
  'a','an','the','is','are','was','were','be','been','being','has','had','do',
  'does','did','will','would','could','should','may','might','shall','can',
  'what','which','who','where','when','why','how','i','you','he','she','it',
  'we','they','me','him','her','us','them','my','your','his','its','our',
  'their','this','that','these','those','in','on','at','by','for','with',
  'about','between','into','through','before','after','to','from','up','down',
  'out','off','or','and','but','nor','yet','not','very','really','too','also',
  'one','two','three','first','second','main','most','more','less','many',
  'much','some','any','all','each','every','of','as','than','such','only',
  'however','even','then','here','there','if','both','either','neither',
  'same','different','new','old','ok','okay','so','um','uh','yeah','yep',
  'hmm','ah','oh','well','like','right','sure','fine','good','yes','no',
  'maybe','just','sort','kind','stuff','thing','things','know','mean',
  'basically','actually','literally','honestly','totally','definitely',
  'hi','hello','hey','bye','thanks','thank','please','sorry','wait',
  'let','get','got','make','put','say','tell','see','think','go','come',
  'give','take','use','want','need','have','try',
]);

const FILLER = new Set([
  'um','uh','hmm','ah','oh','well','like','right','okay','ok','so',
  'basically','actually','literally','honestly','totally','definitely','just',
  'kind','sort','yeah','yep','nope','sure',
]);

// ── NLP Utilities ─────────────────────────────────────────────────────────────

function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9\s'-]/g, ' ').split(/\s+/).filter(w => w.length > 1);
}

function meaningful(text: string): string[] {
  return tokenize(text).filter(w => w.length > 2 && !STOP.has(w));
}

function fillerRatio(text: string): number {
  const tokens = tokenize(text);
  if (tokens.length === 0) return 0;
  const fillers = tokens.filter(w => FILLER.has(w)).length;
  return fillers / tokens.length;
}

function typeTokenRatio(words: string[]): number {
  if (words.length === 0) return 0;
  return new Set(words).size / words.length;
}

// Sentence-count heuristic
function sentenceCount(text: string): number {
  const matches = text.match(/[.!?]+/g);
  return matches ? matches.length : (text.trim().length > 0 ? 1 : 0);
}

// Detect reasoning connectors (logical thinking markers)
const REASONING_PATTERNS = [
  /because\b/i, /therefore\b/i, /which means\b/i, /for example\b/i,
  /such as\b/i, /however\b/i, /although\b/i, /this means\b/i,
  /in order\b/i, /as a result\b/i, /furthermore\b/i, /additionally\b/i,
  /specifically\b/i, /consequently\b/i, /thus\b/i, /hence\b/i,
  /on the other hand\b/i, /in contrast\b/i, /to illustrate\b/i,
  /in summary\b/i, /to summarize\b/i, /first(ly)?\b/i, /second(ly)?\b/i,
  /finally\b/i, /moreover\b/i, /in addition\b/i,
];

function countReasoningMarkers(text: string): number {
  return REASONING_PATTERNS.filter(p => p.test(text)).length;
}

// Detect structure markers (clarity dimension)
const STRUCTURE_PATTERNS = [
  /first(ly)?\b/i, /second(ly)?\b/i, /third(ly)?\b/i, /finally\b/i,
  /in conclusion\b/i, /to summarize\b/i, /for example\b/i, /step \d\b/i,
  /(\d+)\./,  /^\s*[-•*]\s/m,
];

function countStructureMarkers(text: string): number {
  return STRUCTURE_PATTERNS.filter(p => p.test(text)).length;
}

// Detect confidence / hedging signals
const CONFIDENCE_POSITIVE = [
  /\bI (know|believe|understand|have|worked|built|implemented|used|designed)\b/i,
  /\bwe (can|use|need|have|build)\b/i,
  /\bthe (key|main|core|primary|fundamental)\b/i,
  /\bspecifically\b/i, /\bprecisely\b/i, /\bexactly\b/i,
];
const HEDGING = [
  /\bI think\b/i, /\bI guess\b/i, /\bmaybe\b/i, /\bperhaps\b/i,
  /\bI'm not sure\b/i, /\bI don't know\b/i, /\bsomething like\b/i,
  /\bkind of\b/i, /\bsort of\b/i, /\bnot really\b/i,
];

function confidenceScore(text: string): number {
  const pos = CONFIDENCE_POSITIVE.filter(p => p.test(text)).length;
  const hedge = HEDGING.filter(p => p.test(text)).length;
  return Math.max(0, Math.min(100, 50 + pos * 10 - hedge * 12));
}

// Extract domain-level concepts from question
function extractConcepts(question: string): string[] {
  return meaningful(question).filter(w => w.length > 3);
}

// Check concept coverage in answer
function conceptCoverage(concepts: string[], answerWords: Set<string>): { found: string[]; missing: string[] } {
  const found: string[] = [];
  const missing: string[] = [];
  for (const c of concepts) {
    const variants = [c, c + 's', c + 'ed', c + 'ing', c.replace(/ing$/, ''), c.replace(/s$/, '')];
    if (variants.some(v => answerWords.has(v))) found.push(c);
    else missing.push(c);
  }
  return { found, missing };
}

// Grade mapping
function toGrade(score: number): string {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B+';
  if (score >= 60) return 'B';
  if (score >= 50) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

function toLabel(score: number): string {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Adequate';
  if (score >= 30) return 'Weak';
  return 'Poor';
}

// ── Dimension Evaluators ──────────────────────────────────────────────────────

function evalTechnicalCorrectness(
  _question: string,
  _answer: string,
  mw: string[],
  concepts: string[],
  coverage: ReturnType<typeof conceptCoverage>,
): DimensionScore {
  const covPct = concepts.length > 0 ? coverage.found.length / concepts.length : 0;
  const depthBonus = mw.length >= 30 ? 10 : mw.length >= 15 ? 5 : 0;
  const score = Math.min(100, Math.round(covPct * 75 + depthBonus + (mw.length > 5 ? 15 : 0)));

  const detail = score >= 75
    ? `Answer covers ${coverage.found.length}/${concepts.length} key technical concepts accurately.`
    : score >= 45
    ? `Answer is partially correct — covers ${coverage.found.length}/${concepts.length} concepts. Missing: ${coverage.missing.slice(0, 3).join(', ')}.`
    : coverage.found.length === 0
    ? `Answer does not address the technical substance of the question. No expected concepts detected.`
    : `Shallow technical coverage. Only ${coverage.found.length} of ${concepts.length} expected concepts mentioned.`;

  return { name: 'Technical Correctness', score, label: toLabel(score), detail };
}

function evalDepthOfUnderstanding(mw: string[], ttr: number, sentences: number): DimensionScore {
  const depthFromWords = Math.min(50, Math.round((mw.length / 40) * 50));
  const ttrBonus = Math.round(ttr * 30);
  const sentenceBonus = Math.min(20, sentences * 5);
  const score = Math.min(100, depthFromWords + ttrBonus + sentenceBonus);

  const detail = score >= 75
    ? 'Answer demonstrates genuine depth — multiple distinct concepts, well-elaborated.'
    : score >= 50
    ? 'Adequate depth for a mid-level response. Could benefit from more elaboration and examples.'
    : score >= 25
    ? 'Surface-level response. Candidate stated facts without explaining the "why" or "how".'
    : 'Answer is too brief or lacks any meaningful elaboration. Likely memorized phrase or filler.';

  return { name: 'Depth of Understanding', score, label: toLabel(score), detail };
}

function evalLogicalReasoning(text: string, mw: string[]): DimensionScore {
  const markers = countReasoningMarkers(text);
  const baseFromMarkers = Math.min(60, markers * 15);
  const lengthBonus = mw.length >= 20 ? 20 : mw.length >= 10 ? 10 : 0;
  const hasExample = /for example|for instance|such as|e\.g\./i.test(text) ? 20 : 0;
  const score = Math.min(100, baseFromMarkers + lengthBonus + hasExample);

  const detail = score >= 75
    ? `Strong reasoning detected — ${markers} logical connectors used with examples.`
    : score >= 50
    ? 'Some cause-effect reasoning present, but lacks structured logical flow.'
    : score >= 25
    ? 'Minimal reasoning — candidate states facts but does not explain causality or implications.'
    : 'No evidence of logical reasoning. Answer is a collection of statements without explanation.';

  return { name: 'Logical Reasoning & Depth', score, label: toLabel(score), detail };
}

function evalClarityAndStructure(text: string, sentences: number, mw: string[]): DimensionScore {
  const structMarkers = countStructureMarkers(text);
  const avgSentLen = mw.length / Math.max(1, sentences);
  const structureBonus = Math.min(40, structMarkers * 12);
  const sentenceLenScore = avgSentLen >= 4 && avgSentLen <= 20 ? 30 : avgSentLen > 20 ? 15 : 10;
  const lengthScore = sentences >= 3 ? 30 : sentences === 2 ? 20 : 10;
  const score = Math.min(100, structureBonus + sentenceLenScore + lengthScore);

  const detail = score >= 75
    ? 'Well-structured answer with clear flow and logical sequencing.'
    : score >= 50
    ? 'Reasonably clear, but could be better organized with explicit signposting.'
    : score >= 25
    ? 'Structure is unclear — ideas are presented without organization or sequence.'
    : 'No discernible structure. Response reads as an unorganized or incomplete thought.';

  return { name: 'Clarity & Structure', score, label: toLabel(score), detail };
}

function evalCommunicationQuality(text: string, mw: string[], ttr: number, filler: number): DimensionScore {
  const fillerPenalty = Math.round(filler * 100 * 0.6);
  const ttrScore = Math.round(ttr * 50);
  const fluencyBonus = mw.length >= 15 ? 30 : mw.length >= 8 ? 20 : 5;
  const grammarProxy = /[A-Z]/.test(text.charAt(0)) && /[.!?]$/.test(text.trim()) ? 20 : 10;
  const score = Math.min(100, Math.max(0, ttrScore + fluencyBonus + grammarProxy - fillerPenalty));

  const detail = score >= 75
    ? 'Articulate and fluent. Low filler usage, rich vocabulary, and well-formed sentences.'
    : score >= 50
    ? 'Communicates adequately, but vocabulary richness and filler reduction could improve delivery.'
    : score >= 25
    ? `High filler ratio (${Math.round(filler * 100)}%) and limited vocabulary reduce overall quality.`
    : 'Communication quality is poor — answer is difficult to understand or barely coherent.';

  return { name: 'Communication Quality', score, label: toLabel(score), detail };
}

function evalConfidenceLevel(text: string): DimensionScore {
  const score = confidenceScore(text);
  const detail = score >= 75
    ? 'Candidate speaks with authority — uses assertive language and specific claims.'
    : score >= 50
    ? 'Moderate confidence. Some hedging language detected, but generally assertive.'
    : score >= 30
    ? 'Notable hesitation — heavy use of phrases like "I think", "maybe", "I guess".'
    : 'Low confidence evident throughout. Candidate appears uncertain about core concepts.';

  return { name: 'Confidence & Delivery', score, label: toLabel(score), detail };
}

function evalProblemExplanation(text: string, mw: string[], _sentences: number): DimensionScore {
  const hasSteps = /step \d|first(ly)?|second(ly)?|then\b|after(wards)?\b|next\b|finally\b/i.test(text);
  const hasExample = /for example|for instance|such as|e\.g\.|like\b/i.test(text);
  const hasWhy = /because|since\b|reason\b|purpose\b|benefit\b|advantage\b/i.test(text);
  const hasResult = /result|outcome|output|effect|impact|mean|achieve/i.test(text);

  const stepBonus   = hasSteps   ? 25 : 0;
  const exampleBonus = hasExample ? 20 : 0;
  const whyBonus    = hasWhy     ? 20 : 0;
  const resultBonus = hasResult  ? 15 : 0;
  const baseFromLen = Math.min(20, Math.round((mw.length / 30) * 20));
  const score = Math.min(100, stepBonus + exampleBonus + whyBonus + resultBonus + baseFromLen);

  const detail = score >= 75
    ? 'Excellent explanation — candidate uses step-by-step breakdown, examples, and outcomes.'
    : score >= 50
    ? 'Adequate explanation. Candidate covers what but could better explain how and why.'
    : score >= 25
    ? 'Weak explanation ability — no examples, steps, or outcomes. States facts only.'
    : 'No meaningful explanation provided. Answer lacks any breakdown or teaching clarity.';

  return { name: 'Problem Explanation Ability', score, label: toLabel(score), detail };
}

// ── Answer Type Classifier ────────────────────────────────────────────────────

function classifyAnswerType(
  mw: string[],
  ttr: number,
  reasoningMarkers: number,
  overallScore: number,
): DeepEvalResult['answerType'] {
  if (mw.length < 3) return 'Empty';
  if (mw.length < 8 && reasoningMarkers === 0) return 'Vague';
  if (ttr < 0.35 && mw.length < 15) return 'Memorized';
  if (overallScore >= 70 && reasoningMarkers >= 2) return 'Deep';
  if (overallScore >= 45) return 'Adequate';
  return 'Surface';
}

// ── Strengths / Improvements Generator ───────────────────────────────────────

function generateStrengths(dims: DimensionScore[], answerType: string): string[] {
  const strengths: string[] = [];
  const bestDims = [...dims].sort((a, b) => b.score - a.score).slice(0, 2);
  for (const d of bestDims) {
    if (d.score >= 55) strengths.push(`${d.name}: ${d.label} (${d.score}/100) — ${d.detail.split('.')[0]}.`);
  }
  if (answerType === 'Deep') strengths.push('Demonstrates genuine conceptual understanding beyond surface recall.');
  if (dims.find(d => d.name === 'Logical Reasoning & Depth' && d.score >= 60)) {
    strengths.push('Uses cause-effect reasoning and logical connectors effectively.');
  }
  return strengths.length ? strengths : ['Shows effort in attempting the question.'];
}

function generateImprovements(dims: DimensionScore[], coverage: ReturnType<typeof conceptCoverage>): string[] {
  const improvements: string[] = [];
  const worstDims = [...dims].sort((a, b) => a.score - b.score).slice(0, 2);
  for (const d of worstDims) {
    if (d.score < 65) improvements.push(`${d.name} (${d.score}/100): ${d.detail.split('.')[0]}.`);
  }
  if (coverage.missing.length > 0) {
    improvements.push(`Cover missing concepts: ${coverage.missing.slice(0, 4).join(', ')}.`);
  }
  return improvements.length ? improvements : ['Continue practicing for stronger technical depth.'];
}

// ── Overall Summary Generator ─────────────────────────────────────────────────

function generateSummary(
  overallScore: number,
  answerType: string,
  dims: DimensionScore[],
  coverage: ReturnType<typeof conceptCoverage>,
  mwCount: number,
): string {
  const techDim   = dims.find(d => d.name === 'Technical Correctness')!;
  const logicDim  = dims.find(d => d.name === 'Logical Reasoning & Depth')!;
  const commDim   = dims.find(d => d.name === 'Communication Quality')!;

  if (mwCount < 3) {
    return 'The candidate did not provide a substantive answer. No meaningful technical content could be evaluated. This response would not meet the minimum threshold for any professional role.';
  }

  const lines: string[] = [];

  // Line 1: Overall verdict
  if (overallScore >= 80) {
    lines.push(`Strong candidate response scoring ${overallScore}/100 — demonstrates ${answerType.toLowerCase()} understanding with clear, technically accurate content.`);
  } else if (overallScore >= 60) {
    lines.push(`Moderate performance at ${overallScore}/100 — answer is ${answerType.toLowerCase()} with partial technical accuracy and room for deeper elaboration.`);
  } else if (overallScore >= 40) {
    lines.push(`Below-average response at ${overallScore}/100 — ${answerType.toLowerCase()} answer that lacks depth, reasoning, or technical precision.`);
  } else {
    lines.push(`Weak response scoring ${overallScore}/100 — candidate shows minimal grasp of the topic with insufficient technical substance.`);
  }

  // Line 2: Technical + Logic
  lines.push(`Technical coverage is ${techDim.label.toLowerCase()} (${techDim.score}/100) covering ${coverage.found.length}/${coverage.found.length + coverage.missing.length} key concepts; logical reasoning is ${logicDim.label.toLowerCase()} (${logicDim.score}/100).`);

  // Line 3: Communication note
  lines.push(`Communication quality is ${commDim.label.toLowerCase()} (${commDim.score}/100) — ${commDim.detail.split('.')[0].toLowerCase()}.`);

  return lines.join(' ');
}

// ── Main Evaluation Function ──────────────────────────────────────────────────

export function deepEvaluate(question: string, answer: string): DeepEvalResult {
  const trimmedAnswer = (answer || '').trim();
  const trimmedQuestion = (question || '').trim();

  const allWords    = tokenize(trimmedAnswer);
  const mw          = meaningful(trimmedAnswer);
  const mwSet       = new Set(mw);
  const ttr         = typeTokenRatio(mw);
  const filler      = fillerRatio(trimmedAnswer);
  const sentences   = sentenceCount(trimmedAnswer);
  const concepts    = extractConcepts(trimmedQuestion);
  const coverage    = conceptCoverage(concepts, mwSet);
  const reasoningN  = countReasoningMarkers(trimmedAnswer);

  // Evaluate all 7 dimensions
  const d1 = evalTechnicalCorrectness(trimmedQuestion, trimmedAnswer, mw, concepts, coverage);
  const d2 = evalDepthOfUnderstanding(mw, ttr, sentences);
  const d3 = evalLogicalReasoning(trimmedAnswer, mw);
  const d4 = evalClarityAndStructure(trimmedAnswer, sentences, mw);
  const d5 = evalCommunicationQuality(trimmedAnswer, mw, ttr, filler);
  const d6 = evalConfidenceLevel(trimmedAnswer);
  const d7 = evalProblemExplanation(trimmedAnswer, mw, sentences);

  const dimensions = [d1, d2, d3, d4, d5, d6, d7];

  // Weighted overall score
  const WEIGHTS = [0.25, 0.20, 0.18, 0.12, 0.10, 0.08, 0.07];
  const overallScore = Math.round(
    dimensions.reduce((sum, d, i) => sum + d.score * WEIGHTS[i], 0)
  );

  const answerType = classifyAnswerType(mw, ttr, reasoningN, overallScore);
  const strengths  = generateStrengths(dimensions, answerType);
  const improvements = generateImprovements(dimensions, coverage);
  const summary    = generateSummary(overallScore, answerType, dimensions, coverage, mw.length);

  // Paragraph-level analyses
  const techDim  = dimensions[0];
  const logicDim = dimensions[2];
  const commDim  = dimensions[4];
  const confDim  = dimensions[5];

  const technicalUnderstanding = techDim.score >= 70
    ? `Candidate demonstrates ${techDim.label.toLowerCase()} technical understanding. ${techDim.detail}`
    : techDim.score >= 40
    ? `Technical knowledge is ${techDim.label.toLowerCase()}. ${techDim.detail} The candidate understands the topic at a surface level but lacks precision.`
    : `Technical understanding is ${techDim.label.toLowerCase()}. ${techDim.detail} Significant gaps exist in core concept knowledge.`;

  const logicalThinking = logicDim.score >= 70
    ? `Logical reasoning is ${logicDim.label.toLowerCase()}. ${logicDim.detail}`
    : logicDim.score >= 40
    ? `Reasoning ability is ${logicDim.label.toLowerCase()}. ${logicDim.detail} Answers are factual but lack causal linkage.`
    : `Logical thinking is ${logicDim.label.toLowerCase()}. ${logicDim.detail} Candidate needs to practice explaining the "why" behind concepts.`;

  const communicationClarity = `${commDim.label} communication (${commDim.score}/100). ${commDim.detail} ${dimensions[3].detail}`;

  const confidenceDelivery = `${confDim.label} confidence level detected. ${confDim.detail}`;

  return {
    question: trimmedQuestion,
    answer: trimmedAnswer,
    overallScore,
    overallGrade: toGrade(overallScore),
    overallSummary: summary,
    dimensions,
    strengths,
    areasForImprovement: improvements,
    technicalUnderstanding,
    logicalThinking,
    communicationClarity,
    confidenceDelivery,
    answerType,
    wordCount: allWords.length,
    meaningfulWordCount: mw.length,
    detectedConcepts: coverage.found,
    missingConcepts: coverage.missing,
    evaluatedAt: new Date().toISOString(),
  };
}
