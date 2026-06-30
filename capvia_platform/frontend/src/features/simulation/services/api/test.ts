import { apiClient } from './client';
import {
    Session,
    Question,
    Submission,
    CodeExecutionRequest,
    CodeExecutionResponse,
    BehaviorEvent
} from '@/types/test.types';

export const testApi = {
    // Session management
    startSession: async (accessCode: string): Promise<{ session: Session; first_question: Question; time_remaining_seconds: number }> => {
        const response = await apiClient.post('/sessions/start', { access_code: accessCode });
        return response.data;
    },

    getSession: async (sessionId: number): Promise<Session> => {
        const response = await apiClient.get(`/sessions/${sessionId}`);
        return response.data;
    },

    completeSession: async (sessionId: number): Promise<Session> => {
        const response = await apiClient.post(`/sessions/${sessionId}/complete`);
        return response.data;
    },

    // Questions
    getQuestion: async (questionId: number): Promise<Question> => {
        const response = await apiClient.get(`/questions/${questionId}`);
        return response.data;
    },

    // Submissions
    submitAnswer: async (sessionId: number, submission: Submission): Promise<any> => {
        const response = await apiClient.post('/submissions/', {
            session_id: sessionId,
            ...submission,
        });
        return response.data;
    },

    executeCode: async (request: CodeExecutionRequest): Promise<CodeExecutionResponse> => {
        const response = await apiClient.post('/submissions/execute-code', request);
        return response.data;
    },

    // Behavior tracking
    logBehaviorEvent: async (event: BehaviorEvent): Promise<void> => {
        await apiClient.post('/submissions/behavior-event', event);
    },

    // Get submissions
    getSessionSubmissions: async (sessionId: number): Promise<any[]> => {
        const response = await apiClient.get(`/submissions/session/${sessionId}`);
        return response.data;
    },
};