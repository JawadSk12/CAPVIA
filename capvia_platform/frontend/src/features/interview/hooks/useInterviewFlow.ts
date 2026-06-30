// import { useState, useCallback, useEffect } from 'react';
// import { InterviewQuestion, InterviewResponse, InterviewState } from '../types/interview';
// import { QuestionService } from '../services/questionService';
// import { TTSService } from '../services/ttsService';
// import { UploadService } from '../services/uploadService';

// export const useInterviewFlow = (totalQuestions: number = 5) => {
//   const [interviewState, setInterviewState] = useState<InterviewState>({
//     status: 'not_started',
//     currentQuestionIndex: 0,
//     totalQuestions: totalQuestions,
//     responses: [],
//   });

//   const [currentQuestion, setCurrentQuestion] = useState<InterviewQuestion | null>(null);
//   const [isAISpeaking, setIsAISpeaking] = useState(false);

//   useEffect(() => {
//     TTSService.initialize();
//   }, []);

//   const startInterview = useCallback(async () => {
//     console.log('🎬 Starting interview...');
    
//     QuestionService.initialize(totalQuestions);
//     const firstQuestion = QuestionService.getCurrentQuestion();

//     setInterviewState({
//       status: 'in_progress',
//       currentQuestionIndex: 0,
//       totalQuestions: QuestionService.getTotalQuestions(),
//       startTime: new Date().toISOString(),
//       responses: [],
//     });

//     setCurrentQuestion(firstQuestion);

//     if (firstQuestion) {
//       await speakQuestion(firstQuestion.text);
//     }
//   }, [totalQuestions]);

//   const speakQuestion = async (text: string) => {
//     setIsAISpeaking(true);
//     try {
//       await TTSService.speak(text);
//     } catch (error) {
//       console.error('TTS error:', error);
//     } finally {
//       setIsAISpeaking(false);
//     }
//   };

//   const completeInterview = useCallback(() => {
//     console.log('🏁 Interview complete!');
    
//     setInterviewState(prev => {
//       const finalState = {
//         ...prev,
//         status: 'completed' as const,
//         currentQuestionIndex: prev.totalQuestions,
//         endTime: new Date().toISOString(),
//       };
      
//       // Final save to localStorage
//       const responsesToSave = finalState.responses.map(r => ({
//         questionId: r.questionId,
//         question: r.question,
//         audioDuration: r.audioDuration || 0,
//         timestamp: r.timestamp,
//       }));
      
//       localStorage.setItem('interview_responses', JSON.stringify(responsesToSave));
//       localStorage.setItem('interview_complete', 'true');
      
//       console.log('💾 Final save in completeInterview:', responsesToSave.length, 'responses');
      
//       return finalState;
//     });
    
//     setCurrentQuestion(null);
//     TTSService.stop();
//   }, []);

//   const submitAnswer = useCallback(async (response: InterviewResponse) => {
//     console.log('📝 Submitting answer for question:', response.questionId);

//     // Upload response (saves to localStorage)
//     await UploadService.uploadResponse(response);

//     // Update responses in state
//     setInterviewState(prev => {
//       const updatedResponses = [...prev.responses, response];
      
//       // Save to localStorage immediately
//       const responsesToSave = updatedResponses.map(r => ({
//         questionId: r.questionId,
//         question: r.question,
//         audioDuration: r.audioDuration || 0,
//         timestamp: r.timestamp,
//       }));
      
//       localStorage.setItem('interview_responses', JSON.stringify(responsesToSave));
//       console.log('💾 Response saved. Total:', updatedResponses.length);

//       return {
//         ...prev,
//         responses: updatedResponses,
//       };
//     });

//     // Move to next question
//     const nextQuestion = QuestionService.getNextQuestion();

//     if (nextQuestion) {
//       setCurrentQuestion(nextQuestion);
//       setInterviewState(prev => ({
//         ...prev,
//         currentQuestionIndex: QuestionService.getCurrentIndex(),
//       }));

//       await speakQuestion(nextQuestion.text);
//     } else {
//       // Interview complete - update index to trigger completion
//       setInterviewState(prev => ({
//         ...prev,
//         currentQuestionIndex: prev.totalQuestions,
//       }));
      
//       console.log('🎉 All questions answered. Completing interview...');
//       completeInterview();
//     }
//   }, [completeInterview]);

//   const skipQuestion = useCallback(async () => {
//     console.log('⏭️ Skipping question');
//     const nextQuestion = QuestionService.getNextQuestion();

//     if (nextQuestion) {
//       setCurrentQuestion(nextQuestion);
//       setInterviewState(prev => ({
//         ...prev,
//         currentQuestionIndex: QuestionService.getCurrentIndex(),
//       }));
//       await speakQuestion(nextQuestion.text);
//     } else {
//       setInterviewState(prev => ({
//         ...prev,
//         currentQuestionIndex: prev.totalQuestions,
//       }));
//       completeInterview();
//     }
//   }, [completeInterview]);

//   return {
import { useState, useCallback, useEffect, useRef } from 'react';
import { InterviewQuestion, InterviewResponse, InterviewState } from '../types/interview';
import { QuestionService } from '../services/questionService';
import { TTSService } from '../services/ttsService';
import { UploadService } from '../services/uploadService';

export const useInterviewFlow = (totalQuestions: number = 5) => {
  const [interviewState, setInterviewState] = useState<InterviewState>({
    status: 'not_started',
    currentQuestionIndex: 0,
    totalQuestions: totalQuestions,
    responses: [],
  });

  const [currentQuestion, setCurrentQuestion] = useState<InterviewQuestion | null>(null);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [questionsError, setQuestionsError] = useState<string | null>(null);

  // Track if TTS is initialized
  const ttsReady = useRef(false);

  // ─── Initialize TTS on mount ────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        await TTSService.initialize();
        ttsReady.current = true;
        console.log('✅ TTS initialized and ready');
      } catch (err) {
        console.warn('⚠️ TTS init failed, will retry on speak:', err);
      }
    };
    init();

    return () => {
      TTSService.stop();
    };
  }, []);

  // ─── Speak question — NEVER blocks interview progress on failure ────
  const speakQuestion = useCallback(async (text: string) => {
    setIsAISpeaking(true);
    console.log('🎙️ Speaking question:', text.substring(0, 50));

    try {
      // Re-initialize if needed (handles cases where browser blocked autoplay)
      if (!ttsReady.current) {
        await TTSService.initialize();
        ttsReady.current = true;
      }

      await TTSService.speak(text);
    } catch (error) {
      // Log but don't block — interview must continue even if TTS fails
      console.error('🔊 TTS speak failed (continuing anyway):', error);
    } finally {
      setIsAISpeaking(false);
    }
  }, []);

  // ─── Start Interview ────────────────────────────────────────────────
  const startInterview = useCallback(async () => {
    console.log('🎬 Starting interview...');
    setIsLoadingQuestions(true);
    setQuestionsError(null);

    await QuestionService.initializeAsync();
    
    const err = QuestionService.getError();
    if (err) {
      console.warn('⚠️ Fallback questions used:', err);
      setQuestionsError(err);
    }
    setIsLoadingQuestions(false);

    const firstQuestion = QuestionService.getCurrentQuestion();

    setInterviewState({
      status: 'in_progress',
      currentQuestionIndex: 0,
      totalQuestions: QuestionService.getTotalQuestions(),
      startTime: new Date().toISOString(),
      responses: [],
    });

    setCurrentQuestion(firstQuestion);

    if (firstQuestion) {
      // Small delay so UI renders before TTS starts
      await new Promise(r => setTimeout(r, 400));
      await speakQuestion(firstQuestion.text);
    }
  }, [speakQuestion]);

  // ─── Complete Interview ─────────────────────────────────────────────
  const completeInterview = useCallback(() => {
    console.log('🏁 Interview complete!');

    TTSService.stop();

    setInterviewState(prev => {
      const finalState = {
        ...prev,
        status: 'completed' as const,
        currentQuestionIndex: prev.totalQuestions,
        endTime: new Date().toISOString(),
      };

      // Final save to localStorage
      const responsesToSave = finalState.responses.map(r => ({
        questionId: r.questionId,
        question: r.question,
        audioDuration: r.audioDuration || 0,
        timestamp: r.timestamp,
      }));

      localStorage.setItem('interview_responses', JSON.stringify(responsesToSave));
      localStorage.setItem('interview_complete', 'true');

      console.log('💾 Final save:', responsesToSave.length, 'responses');
      return finalState;
    });

    setCurrentQuestion(null);
  }, []);

  // ─── Submit Answer ──────────────────────────────────────────────────
  const submitAnswer = useCallback(async (response: InterviewResponse) => {
    console.log('📝 Submitting answer for question:', response.questionId);

    // Stop any current speech
    TTSService.stop();

    // Upload response
    await UploadService.uploadResponse(response);

    // Update state
    setInterviewState(prev => {
      const updatedResponses = [...prev.responses, response];

      const responsesToSave = updatedResponses.map(r => ({
        questionId: r.questionId,
        question: r.question,
        audioDuration: r.audioDuration || 0,
        timestamp: r.timestamp,
      }));

      localStorage.setItem('interview_responses', JSON.stringify(responsesToSave));
      console.log('💾 Response saved. Total:', updatedResponses.length);

      return { ...prev, responses: updatedResponses };
    });

    // Move to next question
    const nextQuestion = QuestionService.getNextQuestion();

    if (nextQuestion) {
      setCurrentQuestion(nextQuestion);
      setInterviewState(prev => ({
        ...prev,
        currentQuestionIndex: QuestionService.getCurrentIndex(),
      }));

      // Delay so UI updates before TTS fires
      await new Promise(r => setTimeout(r, 300));
      await speakQuestion(nextQuestion.text);
    } else {
      setInterviewState(prev => ({
        ...prev,
        currentQuestionIndex: prev.totalQuestions,
      }));
      console.log('🎉 All questions answered. Completing...');
      completeInterview();
    }
  }, [completeInterview, speakQuestion]);

  // ─── Skip Question ──────────────────────────────────────────────────
  const skipQuestion = useCallback(async () => {
    console.log('⏭️ Skipping question');

    TTSService.stop();

    const nextQuestion = QuestionService.getNextQuestion();

    if (nextQuestion) {
      setCurrentQuestion(nextQuestion);
      setInterviewState(prev => ({
        ...prev,
        currentQuestionIndex: QuestionService.getCurrentIndex(),
      }));
      await new Promise(r => setTimeout(r, 300));
      await speakQuestion(nextQuestion.text);
    } else {
      setInterviewState(prev => ({
        ...prev,
        currentQuestionIndex: prev.totalQuestions,
      }));
      completeInterview();
    }
  }, [completeInterview, speakQuestion]);

  // ─── Re-speak current question (bonus helper) ───────────────────────
  const repeatQuestion = useCallback(async () => {
    if (currentQuestion && !isAISpeaking) {
      await speakQuestion(currentQuestion.text);
    }
  }, [currentQuestion, isAISpeaking, speakQuestion]);

  return {
    interviewState,
    currentQuestion,
    isAISpeaking,
    isLoadingQuestions,
    questionsError,
    startInterview,
    submitAnswer,
    skipQuestion,
    completeInterview,
    repeatQuestion,
  };
};