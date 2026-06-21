/**
 * frontend/lib/api.ts
 * ─────────────────────
 * Centralized Axios API client.
 *
 * All HTTP calls go through this module — never call axios directly.
 *
 * Features:
 *  - Base URL from environment variable
 *  - JWT injection via request interceptor
 *  - 401 → redirect to login
 *  - 429 → show rate limit toast
 *  - Typed endpoint wrapper functions for every backend route
 *  - Token refresh logic on 401 (tries once, then redirects)
 */

import axios, {
    AxiosError,
    AxiosInstance,
    AxiosRequestConfig,
    AxiosResponse,
    InternalAxiosRequestConfig,
} from "axios";
import toast from "react-hot-toast";
import {
    ATSAnalysisResponse,
    CandidateRankingResponse,
    HRAnalytics,
    InternshipATSResult,
    InternshipDetail,
    InternshipSummary,
    ResumeSummary,
    ResumeStatusResponse,
    ResumeUploadResponse,
    RewriteSuggestion,
} from "@/types/ats";

// ─── Token Store ──────────────────────────────────────────────────────────────

// Access token stored in memory (not localStorage — XSS-safe)
// Refresh token is in httpOnly cookie (managed by browser)
let accessToken: string | null = null;
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

export const tokenStore = {
    get: () => accessToken,
    set: (token: string) => { accessToken = token; },
    clear: () => { accessToken = null; },
};

// ─── Axios Instance ───────────────────────────────────────────────────────────

const api: AxiosInstance = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
    timeout: 30000,
    withCredentials: true,   // Send httpOnly cookies with every request
    headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
    },
});

// ─── Request Interceptor ──────────────────────────────────────────────────────

api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = tokenStore.get();
        const isAuthPath = config.url?.includes("/auth/login") || config.url?.includes("/auth/register");
        
        if (token && config.headers && !isAuthPath) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error),
);

// ─── Response Interceptor ────────────────────────────────────────────────────

api.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status === 401 && !originalRequest._retry) {
            // Try to refresh the token once
            if (!isRefreshing) {
                isRefreshing = true;
                refreshPromise = _refreshAccessToken().finally(() => {
                    isRefreshing = false;
                    refreshPromise = null;
                });
            }

            const newToken = await refreshPromise;
            if (newToken) {
                originalRequest._retry = true;
                if (originalRequest.headers) {
                    (originalRequest.headers as Record<string, string>).Authorization = `Bearer ${newToken}`;
                }
                return api(originalRequest);
            } else {
                // Refresh failed → redirect to login (if not already there)
                tokenStore.clear();
                if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
                    window.location.href = "/login?reason=session_expired";
                }
                return Promise.reject(error);
            }
        }

        if (error.response?.status === 429) {
            toast.error("Too many requests. Please wait a moment.");
        }

        if (error.response?.status === 500) {
            const detail = (error.response.data as any)?.detail;
            const traceback = (error.response.data as any)?.traceback;
            console.error("SERVER_ERROR_TRACEBACK:", traceback);
            toast.error(`Server Error: ${detail || "Internal Server Error"}`);
        }

        return Promise.reject(error);
    },
);

async function _refreshAccessToken(): Promise<string | null> {
    try {
        const response = await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/refresh`,
            {},
            { withCredentials: true },
        );
        const newToken = response.data.access_token;
        tokenStore.set(newToken);
        return newToken;
    } catch {
        return null;
    }
}

// ─── Auth Endpoints ───────────────────────────────────────────────────────────

export interface LoginPayload {
    email: string;
    password: string;
}

export interface RegisterPayload {
    full_name: string;
    email: string;
    password: string;
    role: "STUDENT" | "HR";
}

export interface AuthResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    user: {
        id: string;
        email: string;
        full_name: string | null;
        role: string;
        is_active: boolean;
        is_email_verified: boolean;
        created_at: string;
        last_login_at: string | null;
        avatar_url: string | null;
    };
}

export const authApi = {
    login: async (payload: LoginPayload): Promise<AuthResponse> => {
        const { data } = await api.post<AuthResponse>("/api/v1/auth/login", payload);
        tokenStore.set(data.access_token);
        return data;
    },

    register: async (payload: RegisterPayload): Promise<AuthResponse> => {
        const { data } = await api.post<AuthResponse>("/api/v1/auth/register", payload);
        tokenStore.set(data.access_token);
        return data;
    },

    logout: async (): Promise<void> => {
        await api.post("/api/v1/auth/logout");
        tokenStore.clear();
    },

    me: async () => {
        const { data } = await api.get("/api/v1/auth/me");
        return data;
    },
};

// ─── Resume Endpoints ─────────────────────────────────────────────────────────

export const resumeApi = {
    upload: async (
        file: File,
        mode: "GLOBAL" | "INTERNSHIP" = "GLOBAL",
        jdId?: string,
        onUploadProgress?: (percent: number) => void,
    ): Promise<ResumeUploadResponse> => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("mode", mode);
        if (jdId) formData.append("jd_id", jdId);

        const { data } = await api.post<ResumeUploadResponse>(
            "/api/v1/resume/upload",
            formData,
            {
                headers: { "Content-Type": "multipart/form-data" },
                onUploadProgress: (e) => {
                    if (onUploadProgress && e.total) {
                        onUploadProgress(Math.round((e.loaded / e.total) * 100));
                    }
                },
            },
        );
        return data;
    },

    getStatus: async (resumeId: string): Promise<ResumeStatusResponse> => {
        const { data } = await api.get<ResumeStatusResponse>(`/api/v1/resume/${resumeId}/status`);
        return data;
    },

    getAnalysis: async (resumeId: string): Promise<ATSAnalysisResponse> => {
        const { data } = await api.get<ATSAnalysisResponse>(`/api/v1/resume/${resumeId}/analysis`);
        return data;
    },

    getHeatmap: async (resumeId: string) => {
        const { data } = await api.get(`/api/v1/resume/${resumeId}/heatmap`);
        return data;
    },

    requestRewrite: async (
        resumeId: string,
        section: string,
        targetRole?: string,
        jdId?: string,
    ): Promise<EventSource> => {
        // For SSE, we use EventSource (native browser API)
        // We need to send the auth token as a query param for SSE
        const token = tokenStore.get();
        const url = new URL(
            `${process.env.NEXT_PUBLIC_API_URL}/api/v1/resume/${resumeId}/rewrite`
        );

        // POST request for SSE is done via fetch + ReadableStream
        const response = await fetch(url.toString(), {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            credentials: "include",
            body: JSON.stringify({ section, target_role: targetRole, jd_id: jdId }),
        });

        return response as any;  // Caller uses response.body ReadableStream
    },

    getHistory: async (limit = 20, offset = 0): Promise<ResumeSummary[]> => {
        const { data } = await api.get<ResumeSummary[]>("/api/v1/resume/history", {
            params: { limit, offset },
        });
        return data;
    },

    delete: async (resumeId: string): Promise<void> => {
        await api.delete(`/api/v1/resume/${resumeId}`);
    },
};

// ─── Internship Endpoints ─────────────────────────────────────────────────────

export const internshipApi = {
    list: async (activeOnly = true): Promise<InternshipSummary[]> => {
        const { data } = await api.get<InternshipSummary[]>("/api/v1/internship", {
            params: { active_only: activeOnly },
        });
        return data;
    },

    get: async (jdId: string): Promise<InternshipDetail> => {
        const { data } = await api.get<InternshipDetail>(`/api/v1/internship/${jdId}`);
        return data;
    },

    create: async (payload: Partial<InternshipDetail>) => {
        const { data } = await api.post("/api/v1/internship", payload);
        return data;
    },

    update: async (jdId: string, payload: Partial<InternshipDetail>) => {
        const { data } = await api.put(`/api/v1/internship/${jdId}`, payload);
        return data;
    },

    compare: async (
        jdId: string,
        resumeId: string,
        forceRerun = false,
    ) => {
        const { data } = await api.post(
            `/api/v1/internship/${jdId}/compare/${resumeId}`,
            { force_rerun: forceRerun },
        );
        return data;
    },

    getResult: async (jdId: string, resumeId: string): Promise<InternshipATSResult> => {
        const { data } = await api.get<InternshipATSResult>(
            `/api/v1/internship/${jdId}/result/${resumeId}`,
        );
        return data;
    },

    getCandidates: async (
        jdId: string,
        params?: {
            minScore?: number;
            hrStatus?: string;
            flaggedOnly?: boolean;
            limit?: number;
            offset?: number;
        },
    ): Promise<CandidateRankingResponse> => {
        const { data } = await api.get<CandidateRankingResponse>(
            `/api/v1/internship/${jdId}/candidates`,
            { params },
        );
        return data;
    },
};

// ─── HR Endpoints ─────────────────────────────────────────────────────────────

export const hrApi = {
    getAllCandidates: async (params?: {
        jdId?: string;
        hrStatus?: string;
        minScore?: number;
        flaggedOnly?: boolean;
        limit?: number;
        offset?: number;
    }) => {
        const { data } = await api.get("/api/v1/hr/candidates", {
            params: {
                jd_id: params?.jdId,
                hr_status: params?.hrStatus,
                min_score: params?.minScore,
                flagged_only: params?.flaggedOnly,
                limit: params?.limit,
                offset: params?.offset,
            },
        });
        return data;
    },

    getCandidateDetail: async (resumeId: string, jdId?: string) => {
        const { data } = await api.get(`/api/v1/hr/candidate/${resumeId}`, {
            params: { jd_id: jdId },
        });
        return data;
    },

    takeAction: async (
        resumeId: string,
        action: string,
        jdId?: string,
        notes?: string,
    ) => {
        const { data } = await api.post(`/api/v1/hr/candidate/${resumeId}/action`, {
            action,
            jd_id: jdId,
            notes,
        });
        return data;
    },

    getAnalytics: async (): Promise<HRAnalytics> => {
        const { data } = await api.get<HRAnalytics>("/api/v1/hr/analytics");
        return data;
    },

    getFunnel: async (jdId: string) => {
        const { data } = await api.get(`/api/v1/hr/funnel/${jdId}`);
        return data;
    },

    exportCSV: async (jdId: string): Promise<void> => {
        const token = tokenStore.get();
        const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/v1/hr/export/${jdId}`,
            { headers: { Authorization: `Bearer ${token}` }, credentials: "include" },
        );
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `candidates_${jdId}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    },
};

export default api;