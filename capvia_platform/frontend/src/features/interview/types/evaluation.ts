export interface TranscriptionResult {
  text: string;
  confidence: number;
  duration: number;
  words: Word[];
  fillerWords: FillerWord[];
}

export interface Word {
  word: string;
  start: number;
  end: number;
  confidence: number;
}

export interface FillerWord {
  word: string;
  count: number;
  timestamps: number[];
}

export interface CommunicationScore {
  clarity: number; // 0-100
  confidence: number; // 0-100
  coherence: number; // 0-100
  pace: number; // 0-100
  overall: number; // 0-100
  insights: string[];
}

export interface ContentScore {
  relevance: number; // 0-100
  depth: number; // 0-100
  structure: number; // 0-100
  keywords: string[];
  overall: number; // 0-100
  insights: string[];
}

export interface BehavioralScore {
  engagement: number; // 0-100
  authenticity: number; // 0-100
  professionalism: number; // 0-100
  overall: number; // 0-100
  insights: string[];
}

export interface QuestionEvaluation {
  questionId: string;
  question: string;
  transcript: string;
  transcriptionConfidence: number;
  communication: CommunicationScore;
  content: ContentScore;
  behavioral: BehavioralScore;
  overallScore: number;
  recommendation: 'strong_pass' | 'pass' | 'borderline' | 'fail';
  keyHighlights: string[];
  areasForImprovement: string[];
}

export interface InterviewEvaluation {
  candidateId: string;
  interviewId: string;
  timestamp: string;
  questionEvaluations: QuestionEvaluation[];
  overallScores: {
    communication: number;
    content: number;
    behavioral: number;
    overall: number;
  };
  finalRecommendation: 'hire' | 'hold' | 'reject';
  confidenceLevel: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  redFlags: string[];
}