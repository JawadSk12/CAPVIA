export interface InterviewState {
  status: 'not_started' | 'in_progress' | 'paused' | 'completed' | 'failed';
  currentQuestionIndex: number;
  totalQuestions: number;
  startTime?: string;
  endTime?: string;
  responses: InterviewResponse[];
}

export interface InterviewResponse {
  questionId: string;
  question: string;
  answer: string;
  videoBlob?: Blob;
  audioDuration: number;
  timestamp: string;
  answerStartTime: string;
  answerEndTime: string;
}

export interface InterviewQuestion {
  id: string;
  text: string;
  duration: number; // seconds allowed for answer
  category: 'technical' | 'behavioral' | 'situational';
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface InterviewConfig {
  questions: InterviewQuestion[];
  allowSkip: boolean;
  recordVideo: boolean;
  recordAudio: boolean;
  showTimer: boolean;
  adaptiveDifficulty: boolean;
}