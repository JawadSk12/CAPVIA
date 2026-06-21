export interface SpeechMetrics {
  averagePace: number; // words per minute
  pauseFrequency: number; // pauses per minute
  fillerWordRate: number; // filler words per minute
  speechClarity: number; // 0-100
  energyLevel: number; // 0-100
  consistency: number; // 0-100
}

export interface STARAnalysis {
  hasStructure: boolean;
  situation: boolean;
  task: boolean;
  action: boolean;
  result: boolean;
  score: number; // 0-100
}

export interface KeywordMatch {
  keyword: string;
  found: boolean;
  context?: string;
  relevanceScore: number;
}

export interface SentimentAnalysis {
  overall: 'positive' | 'neutral' | 'negative';
  confidence: number;
  emotionalTone: string[];
}

export interface ScriptingIndicators {
  isScripted: boolean;
  confidence: number;
  indicators: {
    repetitivePatterns: boolean;
    unnaturalPacing: boolean;
    lackOfPauses: boolean;
    perfectGrammar: boolean;
  };
}