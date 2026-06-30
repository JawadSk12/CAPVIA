import { TranscriptionResult, Word, FillerWord } from '../types/evaluation';

export class TranscriptionService {
  private static FILLER_WORDS = ['um', 'uh', 'like', 'you know', 'so', 'actually', 'basically', 'literally'];

  /**
   * Simulated transcription (In production: use OpenAI Whisper, AssemblyAI, etc.)
   */
  static async transcribeAudio(audioBlob: Blob): Promise<TranscriptionResult> {
    console.log('🎤 Transcribing audio, size:', audioBlob.size);

    // Simulate API delay
    await this.sleep(1500);

    // In production, this would call a real API:
    // const formData = new FormData();
    // formData.append('file', audioBlob);
    // const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    //   method: 'POST',
    //   headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` },
    //   body: formData,
    // });
    // return response.json();

    // Simulated transcription result
    const mockText = this.generateMockTranscript();
    const words = this.parseWords(mockText);
    const fillerWords = this.detectFillerWords(words);

    return {
      text: mockText,
      confidence: 0.92,
      duration: 45, // seconds
      words,
      fillerWords,
    };
  }

  private static generateMockTranscript(): string {
    const templates = [
      "I have been passionate about software development since my college days. I worked on a team project where we built a mobile application for campus navigation. My role was to design the backend API using Node.js and Express. We faced challenges with real-time location updates, but I implemented WebSocket connections to solve this. The app was successfully deployed and is now used by over 500 students.",
      
      "In my previous internship, I worked with a cross-functional team of five people. We were tasked with improving the user onboarding flow. I analyzed user data and identified that 40% of users dropped off at the registration step. I proposed and implemented a simplified two-step registration process, which increased conversion by 25%.",
      
      "I'm most comfortable with Python and JavaScript. I've used Python for data analysis projects and machine learning coursework. JavaScript is my go-to for web development - I've built several full-stack applications using React and Node.js. I'm also learning Go because I find its concurrency model fascinating.",
    ];

    return templates[Math.floor(Math.random() * templates.length)];
  }

  private static parseWords(text: string): Word[] {
    const words = text.toLowerCase().split(/\s+/);
    return words.map((word, index) => ({
      word: word.replace(/[.,!?;]/g, ''),
      start: index * 0.5,
      end: (index + 1) * 0.5,
      confidence: 0.85 + Math.random() * 0.15,
    }));
  }

  private static detectFillerWords(words: Word[]): FillerWord[] {
    const fillerMap: { [key: string]: FillerWord } = {};

    words.forEach((word) => {
      if (this.FILLER_WORDS.includes(word.word)) {
        if (!fillerMap[word.word]) {
          fillerMap[word.word] = {
            word: word.word,
            count: 0,
            timestamps: [],
          };
        }
        fillerMap[word.word].count++;
        fillerMap[word.word].timestamps.push(word.start);
      }
    });

    return Object.values(fillerMap);
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}