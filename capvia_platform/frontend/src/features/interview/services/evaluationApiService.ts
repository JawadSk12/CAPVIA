/**
 * evaluationApiService.ts
 * =======================
 * Calls the Python FastAPI evaluation server (http://localhost:8765)
 * after all 5 interview answers are collected.
 *
 * If the server is not running, returns a graceful fallback so the
 * Results page still shows integrity data without crashing.
 */

const API_BASE = 'http://localhost:8765';
const TIMEOUT_MS = 120_000; // 2 min — evaluation can take time if LLM is slow

// ── Types ─────────────────────────────────────────────────────────────────────

export interface QAPair {
  question: string;
  answer:   string;
}

export interface QuestionResult {
  question:        string;
  user_answer:     string;
  keyword_score:   number;  // 0–1
  semantic_score:  number;  // 0–1
  concept_score:   number;  // 0–1
  final_score:     number;  // 0–1
  score_pct:       string;  // "72.5%"
  tier:            string;  // "Good"
  color:           string;  // hex
  correct:         string;  // feedback: what was right
  missing:         string;  // feedback: what was absent
  suggestion:      string;  // feedback: how to improve
  covered:         string[];
  missing_concepts: string[];
}

export interface AIEvaluationReport {
  final_score_pct: string;  // "68.4%"
  final_score_raw: number;  // 0–1
  tier:            string;  // "Good"
  color:           string;  // hex
  strengths:       string;
  weaknesses:      string;
  suggestions:     string;
  per_question:    QuestionResult[];
  _error?:         string;  // set if server unavailable
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Check if the evaluation server is running.
 */
export async function isEvaluatorAvailable(): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/health`, { method: 'GET' }, 3000);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Submit all Q&A pairs to the Python evaluation server and return the
 * full AI-scored report.
 *
 * Falls back to a "not evaluated" stub if the server is unavailable.
 *
 * @param role     Candidate role (e.g. "Data Scientist")
 * @param topic    Domain topic (e.g. "Machine Learning")
 * @param qaPairs  Array of { question, answer } — exactly 5 pairs
 */
export async function evaluateInterview(
  role:    string,
  topic:   string,
  qaPairs: QAPair[],
): Promise<AIEvaluationReport> {
  // Validate inputs
  if (!qaPairs || qaPairs.length === 0) {
    return _fallbackReport('No answers were submitted for evaluation.');
  }

  const payload = {
    role,
    topic,
    qa_pairs: qaPairs.map(p => ({
      question: p.question.trim(),
      answer:   (p.answer || '').trim() || '[No answer provided]',
    })),
  };

  try {
    console.log('[EvaluationAPI] Submitting', qaPairs.length, 'answers for evaluation…');
    const res = await fetchWithTimeout(
      `${API_BASE}/evaluate`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      },
      TIMEOUT_MS,
    );

    if (!res.ok) {
      const detail = await res.text();
      console.error('[EvaluationAPI] Server error:', res.status, detail);
      return _fallbackReport(`Evaluation server returned ${res.status}: ${detail}`);
    }

    const report: AIEvaluationReport = await res.json();
    console.log('[EvaluationAPI] ✅ Report received:', report.final_score_pct, report.tier);
    return report;

  } catch (err: any) {
    if (err?.name === 'AbortError') {
      console.warn('[EvaluationAPI] Request timed out after', TIMEOUT_MS / 1000, 's');
      return _fallbackReport('Evaluation timed out — the AI server may be busy. Integrity score still recorded.');
    }
    console.warn('[EvaluationAPI] Server unavailable:', err.message);
    return _fallbackReport(
      'AI evaluation server not running. Start it with: python3 evaluation_server.py'
    );
  }
}

/**
 * Save Q&A pairs to localStorage so Results page can retrieve them.
 * Called inside Interview.tsx when the candidate moves to the next question.
 */
export function saveQAPairToStorage(question: string, answer: string, index: number): void {
  try {
    const key    = 'interview_qa_pairs';
    const stored = localStorage.getItem(key);
    const pairs: QAPair[] = stored ? JSON.parse(stored) : [];
    pairs[index] = { question, answer };
    localStorage.setItem(key, JSON.stringify(pairs));
  } catch (e) {
    console.error('[EvaluationAPI] Failed to save Q&A pair:', e);
  }
}

/**
 * Load all saved Q&A pairs from localStorage.
 */
export function loadQAPairsFromStorage(): QAPair[] {
  try {
    const key    = 'interview_qa_pairs';
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Clear Q&A storage (call before a new interview starts).
 */
export function clearQAPairStorage(): void {
  localStorage.removeItem('interview_qa_pairs');
  localStorage.removeItem('ai_evaluation_report');
}

/**
 * Persist the AI report so Results page can show it even after a re-render.
 */
export function saveEvaluationReport(report: AIEvaluationReport): void {
  try {
    localStorage.setItem('ai_evaluation_report', JSON.stringify(report));
  } catch (e) {
    console.error('[EvaluationAPI] Failed to save report:', e);
  }
}

/**
 * Load previously saved AI report.
 */
export function loadEvaluationReport(): AIEvaluationReport | null {
  try {
    const stored = localStorage.getItem('ai_evaluation_report');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

// ── Private helpers ───────────────────────────────────────────────────────────

function _fallbackReport(error: string): AIEvaluationReport {
  return {
    final_score_pct: 'N/A',
    final_score_raw: 0,
    tier:            'Not Evaluated',
    color:           '#6b7280',
    strengths:       'AI evaluation server was not available during this session.',
    weaknesses:      'Start the evaluation server and retake the interview for full scoring.',
    suggestions:     'Run: python3 evaluation_server.py — then restart the interview.',
    per_question:    [],
    _error:          error,
  };
}
