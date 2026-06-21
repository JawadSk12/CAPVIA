/**
 * Simulations API service
 * Frontend service for role simulation management
 */

import { apiClient } from './client';

export interface RoleInfo {
    key: string;
    role: string;
    description: string;
    difficulty_levels: string[];
    total_duration_minutes: number;
    total_rounds: number;
}

export interface AssignRequest {
    role_key: string;
    candidate_email: string;
    candidate_name?: string;
    difficulty: 'junior' | 'mid' | 'senior';
}

export interface AssignResponse {
    session_id: number;
    access_code: string;
    session_token: string;
    candidate_email: string;
    role: string;
    difficulty: string;
    duration_minutes: number;
    total_rounds: number;
    total_questions: number;
    instructions_url: string;
}

export interface LeaderboardEntry {
    rank: number;
    session_id: number;
    candidate_name: string;
    candidate_email: string;
    role: string;
    role_key: string;
    difficulty: string;
    total_score: number;
    grade: string;
    recommendation: string;
    behavior_risk: string;
    has_suspicious_activity: boolean;
    completed_at: string | null;
}

export const simulationsApi = {
    getRoles: async (): Promise<RoleInfo[]> => {
        const r = await apiClient.get('/simulations/roles');
        return r.data.roles;
    },

    getRoleRounds: async (roleKey: string) => {
        const r = await apiClient.get(`/simulations/roles/${roleKey}/rounds`);
        return r.data;
    },

    assignSimulation: async (req: AssignRequest): Promise<AssignResponse> => {
        const r = await apiClient.post('/simulations/assign', req);
        return r.data;
    },

    getLeaderboard: async (roleKey?: string, limit = 50): Promise<LeaderboardEntry[]> => {
        const params = new URLSearchParams({ limit: String(limit) });
        if (roleKey) params.set('role_key', roleKey);
        const r = await apiClient.get(`/simulations/leaderboard?${params}`);
        return r.data.leaderboard;
    },

    getSessionQuestions: async (sessionId: number, roundNumber?: number) => {
        const params = roundNumber ? `?round_number=${roundNumber}` : '';
        const r = await apiClient.get(`/simulations/sessions/${sessionId}/questions${params}`);
        return r.data;
    },
};
