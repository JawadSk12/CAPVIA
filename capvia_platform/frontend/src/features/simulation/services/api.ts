import axios from 'axios';
import { useAuthStore } from '@/store/auth';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach token
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor — handle 401
apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login';
      }
    }
    return Promise.reject(error);
  }
);

// ── Auth ──────────────────────────────────────
export const authApi = {
  loginHR: (email: string, password: string) =>
    apiClient.post('/auth/login', { email, password }),
  loginCandidate: (email: string, password: string) =>
    apiClient.post('/auth/login', { email, password }),
  registerHR: (data: { email: string; password: string; full_name: string; company_name: string; position?: string }) =>
    apiClient.post('/auth/register/hr', data),
  registerCandidate: (data: { email: string; password: string; full_name: string; skills?: string[] }) =>
    apiClient.post('/auth/register/candidate', data),
  verifyEmail: (token: string) => apiClient.post('/auth/verify-email', { token }),
  forgotPassword: (email: string) => apiClient.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, new_password: string) =>
    apiClient.post('/auth/reset-password', { token, new_password }),
  me: () => apiClient.get('/auth/me'),
  logout: () => {},
};

// ── Internships ───────────────────────────────
export const internshipsApi = {
  create: (data: any) => apiClient.post('/internships/', data),
  list: (params?: any) => apiClient.get('/internships/', { params }),
  get: (id: number) => apiClient.get(`/internships/${id}`),
  update: (id: number, data: any) => apiClient.put(`/internships/${id}`, data),
  getBlueprint: (simInternshipId: number) =>
    apiClient.get(`/gateway/internships/${simInternshipId}/blueprint`),
  generateSimulation: (id: number) =>
    apiClient.post(`/internships/${id}/generate-simulation`),
  getRankings: (id: number) =>
    apiClient.get(`/internships/${id}/rankings`),
  getApplications: (id: number) =>
    apiClient.get(`/internships/${id}/applications`),
};

// ── Applications ──────────────────────────────
export const applicationsApi = {
  apply: (internshipId: number, data: any) =>
    apiClient.post(`/internships/${internshipId}/apply`, data),
  myApplications: () => apiClient.get('/applications/me'),
  startSimulation: (applicationId: number | string) =>
    apiClient.post(`/applications/${applicationId}/start-simulation`),
};

// ── Attempts (proxied via CAPVIA gateway → simulation engine) ─────────────────
// All calls go to CAPVIA backend (port 8000) which proxies to simulation engine (port 8002).
// Using /gateway/attempts/ prefix so CAPVIA can validate auth and relay the request.
export const attemptsApi = {
  get: (id: number) => apiClient.get(`/gateway/attempts/${id}`),
  submitAnswer: (id: number, data: any) => apiClient.post(`/gateway/attempts/${id}/answer`, data),
  completeRound: (id: number, round: number) =>
    apiClient.post(`/gateway/attempts/${id}/complete-round`, null, { params: { round_number: round } }),
  submit: (id: number) => apiClient.post(`/gateway/attempts/${id}/submit`),
  logEvents: (id: number, events: any[]) => apiClient.post(`/gateway/attempts/${id}/events`, events),
  getReport: (id: number) => apiClient.get(`/gateway/attempts/${id}/report`),
};

export default apiClient;

