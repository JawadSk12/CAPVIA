export interface User {
    id: number;
    email: string;
    username: string | null;
    full_name: string | null;
    role: 'admin' | 'candidate' | 'super_admin';
    status: 'active' | 'inactive' | 'suspended';
    is_active: boolean;
    is_verified: boolean;
    created_at: string;
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface RegisterData {
    email: string;
    username?: string;
    full_name?: string;
    password: string;
    role?: 'candidate';
}

export interface AuthResponse {
    access_token: string;
    refresh_token: string;
    token_type: string;
    user: User;
}

export interface ApiError {
    message: string;
    details?: any;
}

export enum QuestionType {
    PROBLEM_UNDERSTANDING = 'problem_understanding',
    CODING = 'coding',
    IMPLEMENTATION = 'implementation',
    DATA_HANDLING = 'data_handling',
    DECISION_MAKING = 'decision_making',
    EXPLANATION = 'explanation',
    DEBUGGING = 'debugging'
}

export enum DifficultyLevel {
    EASY = 'easy',
    MEDIUM = 'medium',
    HARD = 'hard'
}

export enum SessionStatus {
    CREATED = 'created',
    IN_PROGRESS = 'in_progress',
    COMPLETED = 'completed',
    EXPIRED = 'expired',
    TERMINATED = 'terminated'
}