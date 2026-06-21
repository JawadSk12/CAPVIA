/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║         LOCAL AI QUESTION ENGINE  — IntelliRecruit v3.0                    ║
 * ║  PRIMARY:  Ollama (local LLM running on your machine, e.g. mistral/llama3) ║
 * ║  FALLBACK: Smart template bank (if Ollama is not running)                  ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 *
 * HOW IT WORKS:
 *  1. Calls your LOCAL Ollama server at http://localhost:11434
 *  2. Uses any model you have: mistral, llama3, phi3, gemma, etc.
 *  3. Sends a carefully engineered prompt so the LLM generates REAL, UNIQUE,
 *     role-specific questions every single time — just like ChatGPT but offline.
 *  4. Parses the LLM output into InterviewQuestion objects.
 *  5. If Ollama is not running / not installed → falls back to the template bank.
 *
 * TO USE THE REAL AI:
 *  1. Install Ollama: https://ollama.ai
 *  2. Run: ollama pull mistral   (or llama3, phi3, gemma2, etc.)
 *  3. Start the app — questions will be generated fresh by the LLM every session.
 */

import { InterviewQuestion } from '../types/interview';

// ─── Ollama config ─────────────────────────────────────────────────────────────

const OLLAMA_BASE_URL   = 'http://localhost:11434';
const OLLAMA_TIMEOUT_MS = 30_000;  // 30s — generous for local inference

// Priority order of models to try (picks first one that exists)
const MODEL_PRIORITY = ['mistral', 'llama3', 'llama3.2', 'phi3', 'gemma2', 'gemma', 'phi', 'llama2', 'deepseek-r1'];

// ─── Prompt engineering ────────────────────────────────────────────────────────

function buildPrompt(role: string, skills: string[]): string {
  const skillList = skills.length > 0 ? skills.join(', ') : 'the core skills for this role';

  return `You are an expert technical interviewer. You are conducting a structured interview for a candidate applying for: "${role}".

The candidate's relevant skills are: ${skillList}

Your task: Generate EXACTLY 5 interview questions that cover the FULL difficulty spectrum — from very basic to advanced.

STRICT REQUIREMENTS:
- Each question must be specific to the "${role}" role and the listed skills
- Each question must test a DIFFERENT skill or concept from the skill list
- Questions MUST follow the exact difficulty progression below — do NOT make early questions scenario-based

DIFFICULTY PROGRESSION (mandatory — strictly follow this):
Q1: VERY BASIC — A pure definition or "what is" question. Zero scenario, just foundational knowledge.
Q2: BASIC — A concept clarity question. Explain how something works at a conceptual level.
Q3: MODERATE — Applied scenario. The candidate must walk through a real implementation decision or trade-off.
Q4: MODERATE — Debugging or problem-solving. Something breaks — walk me through fixing it.
Q5: HIGH — Complex real-world architecture, edge case, or system design question requiring senior-level thinking.

RESPONSE FORMAT — respond with ONLY these 5 lines, nothing else:
Q1: [question text]
Q2: [question text]
Q3: [question text]
Q4: [question text]
Q5: [question text]`;
}

// ─── Ollama API types ──────────────────────────────────────────────────────────

interface OllamaTagsResponse {
  models: Array<{ name: string; model: string }>;
}

interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  stream: false;
  options?: { temperature: number; top_p: number; num_predict: number };
}

interface OllamaGenerateResponse {
  response: string;
  done: boolean;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

async function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function getAvailableModel(): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(`${OLLAMA_BASE_URL}/api/tags`, { method: 'GET' }, 5000);
    if (!res.ok) return null;
    const data: OllamaTagsResponse = await res.json();
    const names = data.models.map(m => m.name.split(':')[0].toLowerCase());
    console.log('[LocalAI] Ollama models available:', names);
    for (const preferred of MODEL_PRIORITY) {
      if (names.some(n => n.includes(preferred))) {
        const full = data.models.find(m => m.name.toLowerCase().includes(preferred))?.name ?? preferred;
        return full;
      }
    }
    // Just use whatever is available
    return data.models[0]?.name ?? null;
  } catch {
    return null; // Ollama not running
  }
}

const TOTAL_QUESTIONS = 5;

function parseOllamaResponse(raw: string): string[] {
  const questions: string[] = [];
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    const match = line.match(/^Q(\d+)\s*[:.\-–]\s*(.+)$/i);
    if (match) {
      const idx = parseInt(match[1], 10) - 1;
      if (idx >= 0 && idx < TOTAL_QUESTIONS) {
        questions[idx] = match[2].trim();
      }
    }
  }

  // Filter valid slots
  return questions.filter(Boolean);
}

// ─── Ollama question generation ────────────────────────────────────────────────

async function generateFromOllama(role: string, skills: string[]): Promise<string[]> {
  const model = await getAvailableModel();
  if (!model) throw new Error('Ollama not running or no models installed.');

  console.log(`[LocalAI] Generating questions using Ollama model: ${model}`);

  const body: OllamaGenerateRequest = {
    model,
    prompt: buildPrompt(role, skills),
    stream: false,
    options: {
      temperature: 0.7,
      top_p:       0.9,
      num_predict: 500,   // enough for 5 questions
    },
  };

  const res = await fetchWithTimeout(
    `${OLLAMA_BASE_URL}/api/generate`,
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    },
    OLLAMA_TIMEOUT_MS,
  );

  if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);

  const data: OllamaGenerateResponse = await res.json();
  console.log('[LocalAI] Ollama raw response:\n', data.response);

  const questions = parseOllamaResponse(data.response);
  if (questions.length < TOTAL_QUESTIONS) {
    throw new Error(`Ollama returned only ${questions.length} questions (need ${TOTAL_QUESTIONS}). Response: ${data.response.slice(0, 200)}`);
  }

  return questions.slice(0, TOTAL_QUESTIONS);
}

// ─── Fallback template bank (used only if Ollama is unavailable) ───────────────
// Kept intentionally smaller — this is a FALLBACK, not the primary approach.
// The real AI generates role-specific questions dynamically via Ollama.

interface FallbackTemplate {
  texts: string[];   // 2+ variants to avoid repetition
  difficulty: 'easy' | 'medium' | 'hard';
  duration: number;
  category: 'technical' | 'situational' | 'conceptual';
}

const FALLBACK_BY_DIFFICULTY: Record<string, FallbackTemplate[]> = {

  // ── VERY BASIC: Pure definition / naming / "what is" level ─────────────────
  very_basic: [
    {
      difficulty: 'easy', duration: 60, category: 'conceptual',
      texts: [
        'What is {skill}? Describe it in 1-2 sentences as if explaining to someone who has never coded before.',
        'In one sentence, what problem does {skill} solve and why do developers use it?',
        'What does {skill} stand for (if it is an acronym), and what is its primary purpose in a {role} project?',
        'Name three things you can do with {skill} that you cannot easily do without it.',
        'What is the difference between {skill} and a similar tool or concept you know? When would you choose one over the other?',
      ],
    },
    {
      difficulty: 'easy', duration: 60, category: 'conceptual',
      texts: [
        'What is the difference between a function and a method? Give a one-line example of each.',
        'What does "version control" mean and why is it important on a team project?',
        'What is an API? Explain it using a real-world analogy.',
        'What does it mean for code to be "readable"? Give one example of readable vs unreadable code.',
        'What is a bug? Describe a type of bug you have encountered and how you found it.',
      ],
    },
  ],

  // ── BASIC: Concept clarity, simple how-it-works ────────────────────────────
  basic: [
    {
      difficulty: 'easy', duration: 75, category: 'conceptual',
      texts: [
        'What is the most common mistake beginners make when working with {skill}, and how would you avoid it?',
        'How does {skill} work at a high level? Walk me through what happens step-by-step when you use it.',
        'If you had to explain the purpose of {skill} to a non-technical teammate, what would you say?',
        'What are the main components or parts of {skill}? List and briefly describe each one.',
        'Why is {skill} important for {role} work? What would break or be harder without it?',
      ],
    },
    {
      difficulty: 'easy', duration: 75, category: 'conceptual',
      texts: [
        'What is the first thing you must set up or understand before you can use {skill} in a project?',
        'How would you check if {skill} is working correctly after you set it up? What does "working" look like?',
        'What are two common use cases for {skill} in a {role} internship, and which do you find more important?',
        'Describe how {skill} interacts with other parts of a typical {role} project.',
      ],
    },
  ],

  // ── BASIC-TO-MODERATE: Short hands-on or setup question ───────────────────
  basic_moderate: [
    {
      difficulty: 'easy', duration: 90, category: 'technical',
      texts: [
        'Walk me through the steps to set up {skill} from scratch in a new project. What do you install, configure, and test first?',
        'You need to add {skill} to an existing {role} project. What is your step-by-step process to introduce it without breaking existing functionality?',
        'What does a minimal, working example of {skill} look like? Describe the key parts and what each one does.',
        'What is the most important thing to test when you first implement {skill}, and how do you test it?',
      ],
    },
  ],

  // ── MODERATE: Applied scenario, real implementation decisions ─────────────
  moderate: [
    {
      difficulty: 'medium', duration: 120, category: 'technical',
      texts: [
        'Walk me through how you would implement a feature using {skill} from reading the brief to submitting your code. What decisions do you make along the way?',
        'You receive a task that requires {skill}. You have two valid implementation approaches. How do you choose between them, and what trade-offs do you consider?',
        'Your team is building a new feature and asks you to own the {skill} part. Walk me through your technical approach from start to finish.',
        'How do you decide how much to test a {skill} feature? What types of tests would you write and why?',
      ],
    },
    {
      difficulty: 'medium', duration: 120, category: 'situational',
      texts: [
        'You deploy a change using {skill} and it breaks in production but works fine locally. Walk me through your exact debugging process step by step.',
        'A feature you built passes all unit tests but fails in integration testing. The error message is unclear. How do you isolate and fix the bug?',
        'During code review, a senior engineer says your {skill} implementation works but will not scale. What questions do you ask, and how do you redesign it?',
        'You inherit old {role} code that uses {skill} but has no documentation. You need to add a feature without breaking anything. What is your process?',
      ],
    },
  ],

  // ── HIGH: Architecture, edge cases, system-level thinking ─────────────────
  high: [
    {
      difficulty: 'hard', duration: 150, category: 'situational',
      texts: [
        'It is Friday 5 PM before a Monday release. You discover a critical edge case in the {skill} module that could affect real users. You are the only one available. What do you do?',
        'You are asked to design a system that uses {skill} and must handle 10x the expected load. Walk me through your architecture and scaling decisions.',
        'Your {role} team is choosing between two long-term technical approaches. One is faster to build, the other is more sustainable. You must present a recommendation. How do you structure your argument?',
        'A production incident traces back to your {skill} code. The impact is significant and growing. Walk me through your complete incident response, root cause analysis, and what you change afterward.',
        'A new requirement forces you to redesign a core part of your {skill} implementation in a system that is already live with real users. How do you plan and execute that migration with zero downtime?',
      ],
    },
  ],
};

function pickVariant(templates: FallbackTemplate[], usedTexts: Set<string>): { text: string; template: FallbackTemplate } {
  // Shuffle to get variety
  const shuffled = [...templates].sort(() => Math.random() - 0.5);
  for (const tmpl of shuffled) {
    const texts = [...tmpl.texts].sort(() => Math.random() - 0.5);
    for (const t of texts) {
      if (!usedTexts.has(t)) {
        usedTexts.add(t);
        return { text: t, template: tmpl };
      }
    }
  }
  // All variants used — just pick any
  const tmpl = shuffled[0];
  const text = tmpl.texts[Math.floor(Math.random() * tmpl.texts.length)];
  return { text, template: tmpl };
}

function generateFallbackQuestions(role: string, skills: string[]): InterviewQuestion[] {
  const normalizedRole = role.trim() || 'Software Development Intern';
  const baseSkills = skills.length > 0 ? skills : ['JavaScript', 'REST APIs', 'version control', 'debugging', 'testing', 'data structures', 'algorithms', 'databases'];

  // Pad skill list so we have enough variety across 5 questions
  let skillList = [...baseSkills];
  while (skillList.length < 5) skillList = [...skillList, ...baseSkills];

  // Shuffle skills so each session feels different
  const shuffled = [...skillList].sort(() => Math.random() - 0.5);

  const usedTexts = new Set<string>();

  // 5-question plan: very_basic → basic → moderate → moderate → high
  const plan: Array<{ pool: string; skill: string; diff: 'easy' | 'medium' | 'hard' }> = [
    { pool: 'very_basic',    skill: shuffled[0], diff: 'easy'   },  // Q1 — very basic definition
    { pool: 'basic',         skill: shuffled[1], diff: 'easy'   },  // Q2 — basic concept clarity
    { pool: 'moderate',      skill: shuffled[2], diff: 'medium' },  // Q3 — moderate applied
    { pool: 'moderate',      skill: shuffled[3], diff: 'medium' },  // Q4 — moderate debugging
    { pool: 'high',          skill: shuffled[4], diff: 'hard'   },  // Q5 — high level
  ];

  const catMap: Record<string, 'technical' | 'behavioral' | 'situational'> = {
    technical: 'technical', situational: 'situational', conceptual: 'technical',
  };

  return plan.map((p, i) => {
    const pool = FALLBACK_BY_DIFFICULTY[p.pool];
    const { text, template } = pickVariant(pool, usedTexts);
    const resolved = text
      .replace(/\{role\}/g, normalizedRole)
      .replace(/\{skill\}/g, p.skill || 'the core technology');

    return {
      id:         `q${i + 1}`,
      text:       resolved,
      duration:   template.duration,
      difficulty: p.diff,
      category:   catMap[template.category] ?? 'technical',
      metadata:   { role: normalizedRole, skill: p.skill, difficulty: p.pool, questionNumber: i + 1 },
    } as InterviewQuestion;
  });
}

// ─── Public API ────────────────────────────────────────────────────────────────

export interface QuestionGenerationResult {
  questions: InterviewQuestion[];
  source: 'ollama' | 'fallback';
  model?: string;
  error?: string;
}

/**
 * MAIN ENTRY POINT
 *
 * 1. Tries Ollama (local LLM) → genuinely AI-generated, unique every time
 * 2. Falls back to smart template bank if Ollama is not available
 *
 * @param role   - The job role string
 * @param skills - Array of skill strings
 */
export async function generateQuestionsLocal(
  role: string,
  skills: string[],
): Promise<QuestionGenerationResult> {
  // ── Try Ollama first (real AI generation) ─────────────────────────────────
  try {
    const questionTexts = await generateFromOllama(role, skills);

    // 5-question difficulty + duration ladder
    const durations:    number[]                           = [60, 75, 120, 120, 150];
    const difficulties: Array<'easy' | 'medium' | 'hard'> = ['easy', 'easy', 'medium', 'medium', 'hard'];
    const categories:   Array<'technical' | 'situational'>= ['technical', 'technical', 'technical', 'situational', 'situational'];
    const diffLabels = ['very_basic', 'basic', 'moderate', 'moderate', 'high'];

    const questions: InterviewQuestion[] = questionTexts.map((text, i) => ({
      id:         `q${i + 1}`,
      text,
      duration:   durations[i],
      difficulty: difficulties[i],
      category:   categories[i],
      metadata:   { role, difficulty: diffLabels[i], questionNumber: i + 1 },
    } as InterviewQuestion));

    console.log('[LocalAI] ✅ 5 questions generated by local Ollama LLM');
    return { questions, source: 'ollama' };
  } catch (err: any) {
    console.warn('[LocalAI] Ollama unavailable, using fallback bank:', err.message);
  }

  // ── Fallback: template bank ───────────────────────────────────────────────
  const questions = generateFallbackQuestions(role, skills);
  console.log('[LocalAI] 📋 Using fallback template bank (Ollama not detected)');
  return {
    questions,
    source: 'fallback',
    error:  'Ollama not running. Install Ollama and run: ollama pull mistral',
  };
}

// ─── Utility exports ────────────────────────────────────────────────────────────

export async function isOllamaAvailable(): Promise<boolean> {
  const model = await getAvailableModel();
  return model !== null;
}

export async function getOllamaModel(): Promise<string | null> {
  return getAvailableModel();
}
