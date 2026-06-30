import { InterviewQuestion } from '../types/interview';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// ─── Build the exact prompt from the template ─────────────────────────────────

function buildPrompt(role: string, skills: string): string {
  return `You are a strict, professional technical interviewer evaluating a candidate for an INTERN role at a startup.

Your job is to conduct a structured interview that tests:
- Fundamentals
- Concept clarity
- Practical thinking
- Problem-solving ability
- Real-world readiness

INPUT:
Role: ${role}
Skills: ${skills}

TASK:
Generate EXACTLY 5 interview questions.

STRICT RULES:
1. Questions MUST be strictly based on the Role and Skills
2. Do NOT ask generic HR questions
3. Do NOT ask unrelated theory
4. Each question must test a DIFFERENT skill or concept
5. Questions must feel like real startup technical interviews

DIFFICULTY FLOW:
Q1 → Very Basic (core fundamentals)
Q2 → Basic understanding
Q3 → Moderate (applied concept)
Q4 → Moderate-High (problem-solving / debugging)
Q5 → High (real-world scenario / edge case thinking)

QUESTION STYLE:
- Scenario-based
- Practical
- Debugging-oriented
- "How would you…" / "What will you do if…"

Avoid:
- Pure definitions
- Memory-based questions

OUTPUT FORMAT (STRICT — return ONLY this, no extra text):
Q1: ...
Q2: ...
Q3: ...
Q4: ...
Q5: ...`;
}

// ─── Parse the Q1:…Q5: response into InterviewQuestion objects ────────────────

function parseQuestions(raw: string): InterviewQuestion[] {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  const questions: InterviewQuestion[] = [];
  const durations = [90, 90, 120, 120, 150];
  const difficulties: ('easy' | 'medium' | 'hard')[] = ['easy', 'easy', 'medium', 'medium', 'hard'];

  for (const line of lines) {
    const match = line.match(/^Q(\d):?\s*(.+)$/i);
    if (match) {
      const idx = parseInt(match[1], 10) - 1;
      if (idx >= 0 && idx < 5) {
        questions.push({
          id: `q${idx + 1}`,
          text: match[2].trim(),
          duration: durations[idx] ?? 90,
          difficulty: difficulties[idx] ?? 'medium',
          category: idx < 2 ? 'technical' : idx === 2 ? 'situational' : 'technical',
        });
      }
    }
  }

  return questions;
}

// ─── Main call ────────────────────────────────────────────────────────────────

export async function generateQuestionsFromOpenAI(
  role: string,
  skills: string[]
): Promise<InterviewQuestion[]> {
  const apiKey = process.env.REACT_APP_OPENAI_API_KEY;

  if (!apiKey || apiKey === 'sk-your-openai-key-here') {
    throw new Error('OpenAI API key not configured. Add it to your .env file as REACT_APP_OPENAI_API_KEY');
  }

  const skillsStr = skills.join(', ');
  const prompt    = buildPrompt(role || 'Software Development Intern', skillsStr || 'JavaScript, React, REST APIs');

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',         // fast + cheap, perfect for interviews
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 800,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`OpenAI error ${response.status}: ${(err as any)?.error?.message ?? response.statusText}`);
  }

  const data = await response.json();
  const raw  = data.choices?.[0]?.message?.content ?? '';

  console.log('[OpenAI] Raw response:\n', raw);

  const questions = parseQuestions(raw);
  if (questions.length < 5) {
    throw new Error(`OpenAI returned ${questions.length} questions instead of 5. Response: ${raw}`);
  }

  return questions;
}
