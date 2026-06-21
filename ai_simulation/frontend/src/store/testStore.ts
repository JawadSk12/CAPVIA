import { create } from 'zustand';
import { Session, Question } from '@/types/test.types';

interface TestState {
    session: Session | null;
    currentQuestion: Question | null;
    questions: Question[];
    timeRemaining: number;
    isLoading: boolean;

    setSession: (session: Session) => void;
    setCurrentQuestion: (question: Question) => void;
    setQuestions: (questions: Question[]) => void;
    setTimeRemaining: (time: number) => void;
    setLoading: (loading: boolean) => void;
    decrementTime: () => void;
    reset: () => void;
}

export const useTestStore = create<TestState>((set) => ({
    session: null,
    currentQuestion: null,
    questions: [],
    timeRemaining: 0,
    isLoading: false,

    setSession: (session) => set({ session }),
    setCurrentQuestion: (question) => set({ currentQuestion: question }),
    setQuestions: (questions) => set({ questions }),
    setTimeRemaining: (time) => set({ timeRemaining: time }),
    setLoading: (loading) => set({ isLoading: loading }),
    decrementTime: () => set((state) => ({ timeRemaining: Math.max(0, state.timeRemaining - 1) })),
    reset: () => set({
        session: null,
        currentQuestion: null,
        questions: [],
        timeRemaining: 0,
        isLoading: false
    }),
}));