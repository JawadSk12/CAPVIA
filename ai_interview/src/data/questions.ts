import { InterviewQuestion } from '../types/interview';

// ─── Role → Skills dataset mapping ────────────────────────────────────────────
// Maps common intern role keywords to relevant technical skill clusters.
// Used as fallback when the user doesn't specify skills.

const ROLE_SKILL_MAP: Record<string, string[]> = {
  'frontend':         ['React', 'JavaScript', 'HTML/CSS', 'responsive design', 'REST APIs'],
  'backend':          ['Node.js', 'REST APIs', 'databases', 'SQL', 'server-side logic'],
  'fullstack':        ['React', 'Node.js', 'REST APIs', 'databases', 'deployment'],
  'react':            ['React', 'hooks', 'state management', 'component design', 'JSX'],
  'python':           ['Python', 'data structures', 'OOP', 'debugging', 'scripting'],
  'data science':     ['Python', 'pandas', 'data cleaning', 'EDA', 'visualization'],
  'machine learning': ['Python', 'ML models', 'scikit-learn', 'feature engineering', 'evaluation metrics'],
  'android':          ['Kotlin/Java', 'Android SDK', 'activities', 'REST APIs', 'UI design'],
  'ios':              ['Swift', 'UIKit/SwiftUI', 'MVC/MVVM', 'Xcode', 'App Store deployment'],
  'devops':           ['Linux', 'Docker', 'CI/CD', 'bash scripting', 'cloud basics'],
  'ui/ux':            ['Figma', 'wireframing', 'user research', 'prototyping', 'design systems'],
  'cloud':            ['AWS/GCP/Azure basics', 'S3/storage', 'IAM', 'serverless', 'networking'],
  'cybersecurity':    ['networking fundamentals', 'OWASP', 'authentication', 'encryption basics', 'vulnerability scanning'],
  'blockchain':       ['smart contracts', 'Solidity basics', 'Ethereum', 'wallets', 'Web3.js'],
  'embedded':         ['C/C++', 'microcontrollers', 'GPIO', 'interrupts', 'real-time systems'],
};

// ─── Question templates per difficulty × dimension ─────────────────────────────
// Each template is parameterized with {role} and {skill} placeholders.

interface QuestionTemplate {
  text: string;
  difficulty: 'easy' | 'medium' | 'hard';
  duration: number;
  category: 'technical' | 'behavioral' | 'situational';
  dimension: 'fundamentals' | 'concepts' | 'applied' | 'debugging' | 'scenario';
}

const TEMPLATES: QuestionTemplate[] = [

  // ── Q1: VERY BASIC — Pure "what is" / definition ──────────────────────────────
  { dimension: 'fundamentals', difficulty: 'easy', duration: 60, category: 'technical',
    text: 'What is {skill}? Explain it in 1–2 simple sentences as if the other person has never heard of it before.' },
  { dimension: 'fundamentals', difficulty: 'easy', duration: 60, category: 'technical',
    text: 'In one sentence, what problem does {skill} solve, and why do developers in a {role} role use it?' },
  { dimension: 'fundamentals', difficulty: 'easy', duration: 60, category: 'technical',
    text: 'Name three main things you can do with {skill}. Just three bullet points — keep it short and factual.' },
  { dimension: 'fundamentals', difficulty: 'easy', duration: 60, category: 'technical',
    text: 'What does {skill} stand for (if it is an acronym), and what does it actually do in a project?' },

  // ── Q2: VERY BASIC — Compare / choose between two things ──────────────────────
  { dimension: 'concepts', difficulty: 'easy', duration: 60, category: 'technical',
    text: 'What is the difference between {skill} and one similar tool or concept? When would you pick one over the other?' },
  { dimension: 'concepts', difficulty: 'easy', duration: 60, category: 'technical',
    text: 'What is the difference between a function and a method? Give a short one-line example of each.' },
  { dimension: 'concepts', difficulty: 'easy', duration: 60, category: 'technical',
    text: 'What is the difference between synchronous and asynchronous code? Give a real-world analogy to explain it.' },
  { dimension: 'concepts', difficulty: 'easy', duration: 60, category: 'technical',
    text: 'What is the difference between a library and a framework? Which is {skill}, and why does it matter?' },

  // ── Q3: BASIC — How it works + common mistakes ─────────────────────────────────
  { dimension: 'applied', difficulty: 'easy', duration: 75, category: 'technical',
    text: 'How does {skill} work at a high level? Walk me through what happens step-by-step when you use it in a {role} project.' },
  { dimension: 'applied', difficulty: 'easy', duration: 75, category: 'technical',
    text: 'What is the most common mistake a beginner makes when working with {skill}, and how do you avoid it?' },
  { dimension: 'applied', difficulty: 'easy', duration: 75, category: 'technical',
    text: 'What are the main parts or components of {skill}? List and briefly describe each one.' },
  { dimension: 'applied', difficulty: 'easy', duration: 75, category: 'technical',
    text: 'Why is {skill} important for {role} work? What would be harder or impossible without it?' },

  // ── Q4: BASIC — How it fits + where it\'s used ──────────────────────────────────
  { dimension: 'debugging', difficulty: 'easy', duration: 75, category: 'technical',
    text: 'How does {skill} fit into the overall workflow of a {role} project? Walk me through at what point and in what way you would use it.' },
  { dimension: 'debugging', difficulty: 'easy', duration: 75, category: 'technical',
    text: 'What are two common real-world use cases for {skill} in a {role} role? Which do you think is more important and why?' },
  { dimension: 'debugging', difficulty: 'easy', duration: 75, category: 'technical',
    text: 'If you had to explain {skill} to a non-technical teammate in 30 seconds, what would you say?' },

  // ── Q5: BASIC-TO-MODERATE — Setup / first steps ────────────────────────────────
  { dimension: 'scenario', difficulty: 'easy', duration: 90, category: 'technical',
    text: 'Walk me through the steps to set up {skill} from scratch in a new project. What do you install, configure, and verify first?' },
  { dimension: 'scenario', difficulty: 'easy', duration: 90, category: 'technical',
    text: 'You need to add {skill} to an existing {role} project. What is your step-by-step process to introduce it without breaking anything already working?' },
  { dimension: 'scenario', difficulty: 'easy', duration: 90, category: 'technical',
    text: 'What does a minimal, working example of {skill} look like? Describe the key parts and what each one does.' },

  // ── Q6: MODERATE — Applied scenario / implementation decision ───────────────────
  { dimension: 'fundamentals', difficulty: 'medium', duration: 120, category: 'technical',
    text: 'Your team is building a feature that requires {skill}. You have two valid implementation approaches. How do you choose between them and what trade-offs do you consider?' },
  { dimension: 'fundamentals', difficulty: 'medium', duration: 120, category: 'technical',
    text: 'You are assigned a task: "Implement a feature using {skill}." Walk me through your process from reading the brief to submitting a pull request.' },
  { dimension: 'fundamentals', difficulty: 'medium', duration: 120, category: 'situational',
    text: 'During a code review, your senior says your {skill} implementation works but is inefficient. What questions do you ask, and how do you improve it?' },
  { dimension: 'fundamentals', difficulty: 'medium', duration: 120, category: 'technical',
    text: 'How do you decide how much to test a {skill} feature? Describe the types of tests you would write and why.' },

  // ── Q7: MODERATE — Debugging / problem-solving ──────────────────────────────────
  { dimension: 'concepts', difficulty: 'medium', duration: 120, category: 'technical',
    text: 'You deploy a change using {skill} and the app breaks in production but works fine locally. Walk me through exactly how you debug this.' },
  { dimension: 'concepts', difficulty: 'medium', duration: 120, category: 'situational',
    text: 'A feature you built using {skill} passes all unit tests but fails in integration testing with no clear error message. How do you isolate and fix the bug?' },
  { dimension: 'concepts', difficulty: 'medium', duration: 120, category: 'technical',
    text: 'You inherit undocumented {role} code that uses {skill}. You must add a new feature without breaking existing behaviour. What is your process?' },
  { dimension: 'concepts', difficulty: 'medium', duration: 120, category: 'situational',
    text: 'A performance issue is reported in a module that uses {skill}. Users say it is slow. How do you identify the bottleneck and fix it?' },

  // ── Q8: HIGH — Architecture, edge cases, system design ──────────────────────────
  { dimension: 'applied', difficulty: 'hard', duration: 150, category: 'situational',
    text: 'It is Friday 5 PM before a Monday release. You discover a critical edge case in the {skill} module that could affect real users. You are the only engineer available. What do you do, step by step?' },
  { dimension: 'applied', difficulty: 'hard', duration: 150, category: 'technical',
    text: 'You are designing a system that uses {skill} and must handle 10x the expected load. Walk me through your architecture and describe where the scaling challenges are.' },
  { dimension: 'applied', difficulty: 'hard', duration: 150, category: 'situational',
    text: 'Your {role} team must choose between two long-term approaches for a {skill} system. One is faster to ship, the other is more maintainable. How do you evaluate and present your recommendation?' },
  { dimension: 'applied', difficulty: 'hard', duration: 150, category: 'situational',
    text: 'A production incident traces back to your {skill} code. The impact is live and growing. Walk me through your full incident response, root-cause analysis, and what you change afterward.' },
  { dimension: 'applied', difficulty: 'hard', duration: 150, category: 'technical',
    text: 'A new requirement forces you to redesign a core part of your {skill} system while it is already live with real users. How do you plan and execute this migration with zero downtime?' },
];

// ─── Main Generator ────────────────────────────────────────────────────────────

export interface InterviewConfig {
  role: string;
  skills: string[];
  company?: string;
  candidateName?: string;
}

/**
 * Generates EXACTLY 8 questions covering the FULL difficulty spectrum:
 * Q1 = fundamentals (very basic — "what is X?")
 * Q2 = concepts    (very basic — differences / comparisons)
 * Q3 = applied     (basic — how it works / common mistakes)
 * Q4 = debugging   (basic — how it fits in workflow)
 * Q5 = scenario    (basic-to-moderate — setup / first steps)
 * Q6 = fundamentals medium (moderate — implementation decision)
 * Q7 = concepts medium    (moderate — debugging / problem-solving)
 * Q8 = applied hard       (high — architecture / edge cases)
 *
 * Each question targets a DIFFERENT skill from the provided skill list.
 * Questions are personalized with the candidate's role and skill.
 */
export function generateQuestions(config: InterviewConfig): InterviewQuestion[] {
  const { role, skills } = config;
  const normalizedRole = role.trim() || 'Software Development';

  // Infer skills if none provided
  let skillList = skills.filter(s => s.trim().length > 0);
  if (skillList.length === 0) {
    const roleLower = normalizedRole.toLowerCase();
    const matchedKey = Object.keys(ROLE_SKILL_MAP).find(key => roleLower.includes(key));
    skillList = matchedKey ? ROLE_SKILL_MAP[matchedKey] : ['JavaScript', 'REST APIs', 'version control', 'data structures', 'testing', 'debugging', 'algorithms', 'databases'];
  }

  // Ensure we have at least 8 skills (repeat/cycle if needed)
  while (skillList.length < 8) {
    skillList = [...skillList, ...skillList];
  }

  // Shuffle skills so questions feel varied each session
  const shuffled = [...skillList].sort(() => Math.random() - 0.5);

  // 8-slot dimension plan — each entry picks templates with that dimension AND difficulty
  const plan: Array<{ dimension: QuestionTemplate['dimension']; difficulty: QuestionTemplate['difficulty'] }> = [
    { dimension: 'fundamentals', difficulty: 'easy'   },  // Q1 very basic definition
    { dimension: 'concepts',     difficulty: 'easy'   },  // Q2 very basic comparison
    { dimension: 'applied',      difficulty: 'easy'   },  // Q3 basic — how it works
    { dimension: 'debugging',    difficulty: 'easy'   },  // Q4 basic — how it fits
    { dimension: 'scenario',     difficulty: 'easy'   },  // Q5 basic-moderate — setup
    { dimension: 'fundamentals', difficulty: 'medium' },  // Q6 moderate — applied decision
    { dimension: 'concepts',     difficulty: 'medium' },  // Q7 moderate — debugging
    { dimension: 'applied',      difficulty: 'hard'   },  // Q8 high — architecture
  ];

  const questions: InterviewQuestion[] = plan.map((slot, index) => {
    // Filter by both dimension AND difficulty so the right tier is always selected
    const candidates = TEMPLATES.filter(t => t.dimension === slot.dimension && t.difficulty === slot.difficulty);
    // Fallback: just filter by dimension if no difficulty match found
    const pool     = candidates.length > 0 ? candidates : TEMPLATES.filter(t => t.dimension === slot.dimension);
    const template = pool[Math.floor(Math.random() * pool.length)];
    const skill    = shuffled[index] ?? skillList[0];

    const questionText = template.text
      .replace(/\{role\}/g, normalizedRole)
      .replace(/\{skill\}/g, skill);

    return {
      id: `q${index + 1}`,
      text: questionText,
      duration: template.duration,
      category: template.category,
      difficulty: template.difficulty,
      metadata: {
        role: normalizedRole,
        skill,
        dimension: slot.dimension,
        questionNumber: index + 1,
      },
    } as InterviewQuestion;
  });

  console.log('[QuestionGenerator] Generated 8 questions for role:', normalizedRole, 'skills:', shuffled.slice(0, 8));
  return questions;
}

// ─── Config storage (sessionStorage so it survives navigation) ─────────────────

const CONFIG_KEY = 'interview_config';

export function saveInterviewConfig(config: InterviewConfig): void {
  sessionStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export function loadInterviewConfig(): InterviewConfig | null {
  try {
    const raw = sessionStorage.getItem(CONFIG_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearInterviewConfig(): void {
  sessionStorage.removeItem(CONFIG_KEY);
}

// ─── Legacy static question bank (kept as fallback) ───────────────────────────

export const INTERNSHIP_QUESTIONS: InterviewQuestion[] = [
  { id: 'q1', text: 'Tell me about yourself and why you\'re interested in this internship.', duration: 120, category: 'behavioral', difficulty: 'easy' },
  { id: 'q2', text: 'Describe a time when you faced a challenging problem. How did you approach it?', duration: 90, category: 'behavioral', difficulty: 'medium' },
  { id: 'q3', text: 'Tell me about a team project you worked on. What was your role and contribution?', duration: 90, category: 'behavioral', difficulty: 'medium' },
  { id: 'q4', text: 'What programming languages are you most comfortable with, and why?', duration: 60, category: 'technical', difficulty: 'easy' },
  { id: 'q5', text: 'Explain the difference between a stack and a queue. When would you use each?', duration: 90, category: 'technical', difficulty: 'medium' },
];

export function getQuestionsForInterview(count: number = 5): InterviewQuestion[] {
  // Try to use dynamically generated questions if config is stored
  const config = loadInterviewConfig();
  if (config) {
    return generateQuestions(config);
  }
  // Fallback to static bank
  return INTERNSHIP_QUESTIONS.slice(0, Math.min(count, INTERNSHIP_QUESTIONS.length));
}

export const getAdaptiveQuestion = (
  previousResponses: any[],
  difficulty: 'easy' | 'medium' | 'hard'
): InterviewQuestion | null => {
  const filtered = INTERNSHIP_QUESTIONS.filter(q => q.difficulty === difficulty);
  if (filtered.length === 0) return null;
  const askedIds = previousResponses.map(r => r.questionId);
  return filtered.find(q => !askedIds.includes(q.id)) || null;
};