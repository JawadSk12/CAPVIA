/**
 * QuestionService — backed by the Local AI Engine (Ollama → fallback bank)
 */

import { InterviewQuestion } from '../types/interview';
import { generateQuestionsLocal, isOllamaAvailable } from './localQuestionAI';
import { loadInterviewConfig } from '../data/questions';

export class QuestionService {
  private static questions: InterviewQuestion[] = [];
  private static currentIndex: number = 0;
  private static loading: boolean = false;
  private static error: string | null = null;
  private static aiSource: 'ollama' | 'fallback' | null = null;

  // ── Initialize ─────────────────────────────────────────────────────────────

  static async initializeAsync(): Promise<void> {
    this.currentIndex = 0;
    this.loading = true;
    this.error = null;

    try {
      const config = loadInterviewConfig();
      const role   = config?.role   ?? 'Software Development Intern';
      const skills = config?.skills ?? [];

      // Check Ollama availability first so we can show the right status
      const ollamaReady = await isOllamaAvailable();
      console.log(`[QuestionService] Ollama available: ${ollamaReady}. Role: "${role}"`);

      const result = await generateQuestionsLocal(role, skills);
      this.questions = result.questions;
      this.aiSource  = result.source;

      if (result.error) {
        console.warn('[QuestionService] Fallback used:', result.error);
        this.error = result.error;
      }

      console.log(
        `[QuestionService] ${result.source === 'ollama' ? '🤖 AI-generated' : '📋 Fallback'} — ` +
        `${this.questions.length} questions ready for role: "${role}"`
      );
    } catch (err: any) {
      console.error('[QuestionService] Critical failure:', err.message);
      this.error = err.message;
      this.questions = this.getEmergencyFallback();
    } finally {
      this.loading = false;
    }
  }

  static initialize(_questionCount: number = 5): void {
    this.currentIndex = 0;
    if (this.questions.length === 0) {
      console.warn('[QuestionService] Sync init called — use initializeAsync() for real AI generation');
    }
  }

  // ── Accessors ──────────────────────────────────────────────────────────────

  static getCurrentQuestion(): InterviewQuestion | null {
    return this.currentIndex < this.questions.length
      ? this.questions[this.currentIndex]
      : null;
  }

  static getNextQuestion(): InterviewQuestion | null {
    this.currentIndex++;
    return this.getCurrentQuestion();
  }

  static getPreviousQuestion(): InterviewQuestion | null {
    if (this.currentIndex > 0) this.currentIndex--;
    return this.getCurrentQuestion();
  }

  static getTotalQuestions(): number               { return this.questions.length; }
  static getCurrentIndex(): number                 { return this.currentIndex; }
  static isLastQuestion(): boolean                 { return this.currentIndex === this.questions.length - 1; }
  static isFirstQuestion(): boolean                { return this.currentIndex === 0; }
  static getAllQuestions(): InterviewQuestion[]     { return [...this.questions]; }
  static isLoading(): boolean                      { return this.loading; }
  static getError(): string | null                 { return this.error; }
  static getAISource(): 'ollama' | 'fallback' | null { return this.aiSource; }

  static getProgress() {
    return {
      current:    this.currentIndex + 1,
      total:      this.questions.length,
      percentage: ((this.currentIndex + 1) / this.questions.length) * 100,
    };
  }

  static reset(): void { this.currentIndex = 0; }

  private static getEmergencyFallback(): InterviewQuestion[] {
    const config = loadInterviewConfig();
    const role = config?.role ?? 'Software Development';
    return [
      { id: 'q1', text: `What is the most fundamental concept in ${role} work that every intern must know on day one?`, duration: 90,  category: 'technical',   difficulty: 'easy'   },
      { id: 'q2', text: `What is the most common mistake made by beginners in the ${role} role, and how do you avoid it?`,  duration: 90,  category: 'technical',   difficulty: 'easy'   },
      { id: 'q3', text: `Walk me through implementing a new feature in a ${role} context from brief to code review.`,       duration: 120, category: 'situational', difficulty: 'medium' },
      { id: 'q4', text: `Something breaks in production in your ${role} area. Walk me through your debugging process.`,    duration: 120, category: 'technical',   difficulty: 'medium' },
      { id: 'q5', text: `You are facing a difficult architectural decision in your ${role} project. How do you decide?`,   duration: 150, category: 'situational', difficulty: 'hard'   },
    ];
  }
}