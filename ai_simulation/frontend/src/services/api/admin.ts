import { apiClient } from './client';
import { Session, Question, Evaluation } from '@/types/test.types';

export const adminApi = {
    // Dashboard
    getDashboard: async (): Promise<any> => {
        const response = await apiClient.get('/admin/dashboard');
        return response.data;
    },

    getAnalytics: async (days: number = 30): Promise<any> => {
        const response = await apiClient.get(`/admin/analytics/sessions?days=${days}`);
        return response.data;
    },

    getPerformanceAnalytics: async (): Promise<any> => {
        const response = await apiClient.get('/admin/analytics/performance');
        return response.data;
    },

    // Sessions
    listSessions: async (skip: number = 0, limit: number = 100): Promise<{ sessions: Session[]; total: number }> => {
        const response = await apiClient.get(`/sessions?skip=${skip}&limit=${limit}`);
        return response.data;
    },

    createSession: async (data: any): Promise<Session> => {
        const response = await apiClient.post('/sessions/', data);
        return response.data;
    },

    generateTestSession: async (data: {
        candidate_email: string;
        candidate_name: string;
        role: string;
        domain?: string;
        language?: string;
    }): Promise<Session> => {
        const response = await apiClient.post('/sessions/generate', null, { params: data });
        return response.data;
    },

    // Questions
    listQuestions: async (skip: number = 0, limit: number = 100): Promise<{ questions: Question[]; total: number }> => {
        const response = await apiClient.get(`/questions?skip=${skip}&limit=${limit}`);
        return response.data;
    },

    createQuestion: async (data: any): Promise<Question> => {
        const response = await apiClient.post('/questions/', data);
        return response.data;
    },

    generateQuestion: async (data: {
        question_type: string;
        role: string;
        domain?: string;
        language?: string;
        difficulty?: string;
    }): Promise<Question> => {
        const response = await apiClient.post('/questions/generate', null, { params: data });
        return response.data;
    },

    // Evaluations
    evaluateSession: async (sessionId: number): Promise<Evaluation> => {
        const response = await apiClient.post(`/evaluations/session/${sessionId}`);
        return response.data;
    },

    getEvaluationReport: async (sessionId: number): Promise<any> => {
        const response = await apiClient.get(`/evaluations/session/${sessionId}/report`);
        return response.data;
    },

    getFlaggedSessions: async (): Promise<any[]> => {
        const response = await apiClient.get('/admin/sessions/flagged');
        return response.data;
    },
};