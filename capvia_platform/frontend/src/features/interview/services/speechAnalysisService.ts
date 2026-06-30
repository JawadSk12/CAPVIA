import { SpeechMetrics, ScriptingIndicators } from '../types/analysis';
import { TranscriptionResult } from '../types/evaluation';

export class SpeechAnalysisService {
  /**
   * Analyze speech patterns and metrics
   */
  static analyzeSpeech(transcription: TranscriptionResult, duration: number): SpeechMetrics {
    const wordCount = transcription.words.length;
    const wordsPerMinute = (wordCount / duration) * 60;

    const pauses = this.detectPauses(transcription.words);
    const pauseFrequency = (pauses / duration) * 60;

    const fillerWordCount = transcription.fillerWords.reduce((sum, f) => sum + f.count, 0);
    const fillerWordRate = (fillerWordCount / duration) * 60;

    const avgConfidence = this.calculateAverageConfidence(transcription.words);
    const paceConsistency = this.calculatePaceConsistency(transcription.words);

    return {
      averagePace: Math.round(wordsPerMinute),
      pauseFrequency: Math.round(pauseFrequency * 10) / 10,
      fillerWordRate: Math.round(fillerWordRate * 10) / 10,
      speechClarity: Math.round(avgConfidence * 100),
      energyLevel: this.estimateEnergyLevel(wordsPerMinute, pauseFrequency),
      consistency: Math.round(paceConsistency * 100),
    };
  }

  /**
   * Detect if answer appears scripted
   */
  static detectScripting(transcription: TranscriptionResult, speechMetrics: SpeechMetrics): ScriptingIndicators {
    const indicators = {
      repetitivePatterns: this.hasRepetitivePatterns(transcription.text),
      unnaturalPacing: speechMetrics.averagePace > 180 || speechMetrics.averagePace < 80,
      lackOfPauses: speechMetrics.pauseFrequency < 2,
      perfectGrammar: speechMetrics.speechClarity > 95,
    };

    const indicatorCount = Object.values(indicators).filter(Boolean).length;
    const isScripted = indicatorCount >= 3;
    const confidence = indicatorCount / 4;

    return {
      isScripted,
      confidence,
      indicators,
    };
  }

  private static detectPauses(words: any[]): number {
    let pauseCount = 0;
    for (let i = 1; i < words.length; i++) {
      const gap = words[i].start - words[i - 1].end;
      if (gap > 0.5) pauseCount++; // Pause if gap > 0.5 seconds
    }
    return pauseCount;
  }

  private static calculateAverageConfidence(words: any[]): number {
    if (words.length === 0) return 0;
    const sum = words.reduce((acc, word) => acc + word.confidence, 0);
    return sum / words.length;
  }

  private static calculatePaceConsistency(words: any[]): number {
    if (words.length < 2) return 1;

    const intervals = [];
    for (let i = 1; i < words.length; i++) {
      intervals.push(words[i].start - words[i - 1].start);
    }

    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);

    return Math.max(0, 1 - stdDev);
  }

  private static estimateEnergyLevel(pace: number, pauseFreq: number): number {
    const paceScore = Math.min(pace / 150, 1) * 60;
    const pauseScore = Math.max(0, 1 - pauseFreq / 10) * 40;
    return Math.round(paceScore + pauseScore);
  }

  private static hasRepetitivePatterns(text: string): boolean {
    const sentences = text.split(/[.!?]+/);
    const uniqueSentences = new Set(sentences.map(s => s.trim().toLowerCase()));
    return sentences.length - uniqueSentences.size > 2;
  }
}