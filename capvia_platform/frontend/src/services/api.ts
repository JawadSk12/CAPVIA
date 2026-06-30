import axios from 'axios';
import { Application } from '../types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Automatically inject JWT Bearer Access Token into outbound requests
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('capvia_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle Token Refresh on 401 Unauthorized (Dynamic Rotation)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('capvia_refresh_token');
        if (refreshToken) {
          const res = await axios.post(`${API_URL}/auth/refresh`, { refresh_token: refreshToken });
          const { access_token, refresh_token } = res.data;
          
          localStorage.setItem('capvia_access_token', access_token);
          localStorage.setItem('capvia_refresh_token', refresh_token);
          
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Clear auth storage if refresh fails (token revoked or expired)
        localStorage.removeItem('capvia_access_token');
        localStorage.removeItem('capvia_refresh_token');
        localStorage.removeItem('capvia_user');
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  register: async (payload: any) => {
    const response = await apiClient.post('/auth/register', payload);
    return response.data;
  },
  login: async (payload: any) => {
    const response = await apiClient.post('/auth/login', payload);
    return response.data;
  },
  logout: async (refreshToken: string) => {
    const response = await apiClient.post('/auth/logout', { refresh_token: refreshToken });
    return response.data;
  },
  forgotPassword: async (email: string) => {
    const response = await apiClient.post('/auth/forgot-password', { email });
    return response.data;
  },
  resetPassword: async (payload: any) => {
    const response = await apiClient.post('/auth/reset-password', payload);
    return response.data;
  },
  verifyEmail: async (token: string) => {
    const response = await apiClient.post('/auth/verify-email', { token });
    return response.data;
  }
};

export const recruitmentApi = {
  getApplications: async (): Promise<Application[]> => {
    const response = await apiClient.get<Application[]>('/applications');
    return response.data;
  },
  triggerWebhook: async (applicationId: string, event: string): Promise<any> => {
    const response = await apiClient.post(`/test/trigger-webhook?application_id=${applicationId}&event=${event}`);
    return response.data;
  },
};

export const companyApi = {
  list: async (page = 1, perPage = 20, search?: string) => {
    const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
    if (search) params.append('search', search);
    const response = await apiClient.get(`/companies?${params.toString()}`);
    return response.data;
  },
  listMine: async () => {
    const response = await apiClient.get('/companies/mine');
    return response.data;
  },
  get: async (id: string) => {
    const response = await apiClient.get(`/companies/${id}`);
    return response.data;
  },
  create: async (payload: {
    name: string; description?: string; logo_url?: string; industry?: string;
    website_url?: string; headquarters?: string; founded_year?: number; employee_count?: string;
  }) => {
    const response = await apiClient.post('/companies', payload);
    return response.data;
  },
  update: async (id: string, payload: Partial<{
    name: string; description: string; logo_url: string; industry: string;
    website_url: string; headquarters: string; founded_year: number; employee_count: string;
  }>) => {
    const response = await apiClient.put(`/companies/${id}`, payload);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await apiClient.delete(`/companies/${id}`);
    return response.data;
  },
  getAnalytics: async (id: string) => {
    const response = await apiClient.get(`/companies/${id}/analytics`);
    return response.data;
  },
  getMembers: async (id: string) => {
    const response = await apiClient.get(`/companies/${id}/members`);
    return response.data;
  },
  addMember: async (id: string, userId: string, role: string = 'MEMBER') => {
    const response = await apiClient.post(`/companies/${id}/members`, { user_id: userId, member_role: role });
    return response.data;
  },
  removeMember: async (companyId: string, userId: string) => {
    const response = await apiClient.delete(`/companies/${companyId}/members/${userId}`);
    return response.data;
  },
  transferOwnership: async (companyId: string, newOwnerId: string) => {
    const response = await apiClient.post(`/companies/${companyId}/transfer-ownership`, { new_owner_id: newOwnerId });
    return response.data;
  },
  verify: async (companyId: string) => {
    const response = await apiClient.post(`/companies/${companyId}/verify`);
    return response.data;
  },
};

export const internshipApi = {
  list: async (params: Record<string, any> = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.append(k, String(v));
    });
    const response = await apiClient.get(`/internships?${query.toString()}`);
    return response.data;
  },
  manage: async (params: Record<string, any> = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.append(k, String(v));
    });
    const response = await apiClient.get(`/internships/manage?${query.toString()}`);
    return response.data;
  },
  get: async (id: string) => {
    const response = await apiClient.get(`/internships/${id}`);
    return response.data;
  },
  create: async (payload: Record<string, any>) => {
    const response = await apiClient.post('/internships', payload);
    return response.data;
  },
  update: async (id: string, payload: Record<string, any>) => {
    const response = await apiClient.put(`/internships/${id}`, payload);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await apiClient.delete(`/internships/${id}`);
    return response.data;
  },
  publish: async (id: string) => {
    const response = await apiClient.post(`/internships/${id}/publish`);
    return response.data;
  },
  close: async (id: string) => {
    const response = await apiClient.post(`/internships/${id}/close`);
    return response.data;
  },
  archive: async (id: string) => {
    const response = await apiClient.post(`/internships/${id}/archive`);
    return response.data;
  },
  restore: async (id: string) => {
    const response = await apiClient.post(`/internships/${id}/restore`);
    return response.data;
  },
  duplicate: async (id: string) => {
    const response = await apiClient.post(`/internships/${id}/duplicate`);
    return response.data;
  },
  getAnalytics: async (id: string) => {
    const response = await apiClient.get(`/internships/${id}/analytics`);
    return response.data;
  },
};

// =========================================================================
// Phase 9: Application API
// =========================================================================
export const applicationApi = {
  apply: async (data: { internship_id: string; cover_letter?: string; resume_url?: string }) => {
    const response = await apiClient.post('/applications', data);
    return response.data;
  },
  getMyApplications: async (params?: { page?: number; per_page?: number; status?: string }) => {
    const response = await apiClient.get('/applications/me', { params });
    return response.data;
  },
  getDashboard: async () => {
    const response = await apiClient.get('/applications/dashboard');
    return response.data;
  },
  getDetail: async (id: string) => {
    const response = await apiClient.get(`/applications/${id}`);
    return response.data;
  },
  getTimeline: async (id: string) => {
    const response = await apiClient.get(`/applications/${id}/timeline`);
    return response.data;
  },
  withdraw: async (id: string) => {
    const response = await apiClient.delete(`/applications/${id}`);
    return response.data;
  },
  // HR actions
  getInternshipApplications: async (
    internshipId: string,
    params?: { page?: number; per_page?: number; status?: string; sort_by?: string; sort_dir?: string }
  ) => {
    const response = await apiClient.get(`/internships/${internshipId}/applications`, { params });
    return response.data;
  },
  shortlist: async (id: string) => {
    const response = await apiClient.post(`/applications/${id}/shortlist`);
    return response.data;
  },
  reject: async (id: string, reason?: string) => {
    const response = await apiClient.post(`/applications/${id}/reject`, { reason });
    return response.data;
  },
  hire: async (id: string) => {
    const response = await apiClient.post(`/applications/${id}/hire`);
    return response.data;
  },
  updateStatus: async (id: string, status: string, metadata?: Record<string, unknown>) => {
    const response = await apiClient.put(`/applications/${id}/status`, { status, metadata });
    return response.data;
  },
};

export const notificationApi = {
  list: async (params?: { page?: number; per_page?: number; unread_only?: boolean }) => {
    const response = await apiClient.get('/notifications', { params });
    return response.data;
  },
  markRead: async (id: string) => {
    const response = await apiClient.post(`/notifications/${id}/read`);
    return response.data;
  },
  markAllRead: async () => {
    const response = await apiClient.post('/notifications/read-all');
    return response.data;
  },
};

export const interviewApi = {
  start: async (payload: {
    application_id: string;
    candidate_id: string;
    candidate_name: string;
    job_role: string;
    skills: string[];
    company_name: string;
  }) => {
    const response = await apiClient.post('/interview/start', payload);
    return response.data;
  },
  saveAnswer: async (payload: {
    question_index: number;
    audio_duration_sec: number;
    transcript: string;
    proctoring_violations_count: number;
    proctoring_details?: Record<string, any>;
  }) => {
    const response = await apiClient.post('/interview/answer', payload);
    return response.data;
  },
  complete: async (payload: {
    session_id: string;
    video_url: string;
    local_violations_json: string;
    baselined_locally?: boolean;
    local_evaluation_report_json?: string;
  }) => {
    const formData = new FormData();
    formData.append('session_id', payload.session_id);
    formData.append('video_url', payload.video_url);
    formData.append('local_violations_json', payload.local_violations_json);
    if (payload.baselined_locally !== undefined) {
      formData.append('baselined_locally', String(payload.baselined_locally));
    }
    if (payload.local_evaluation_report_json !== undefined && payload.local_evaluation_report_json !== null) {
      formData.append('local_evaluation_report_json', payload.local_evaluation_report_json);
    }
    const response = await apiClient.post('/interview/complete', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  getStatus: async (applicationId: string) => {
    const response = await apiClient.get(`/interview/status/${applicationId}`);
    return response.data;
  },
  getResult: async (applicationId: string) => {
    const response = await apiClient.get(`/interview/result/${applicationId}`);
    return response.data;
  },
};

export const rankingsApi = {
  compute: async (applicationId: string) => {
    const response = await apiClient.post(`/rankings/${applicationId}/compute`);
    return response.data;
  },
  get: async (applicationId: string) => {
    const response = await apiClient.get(`/rankings/${applicationId}`);
    return response.data;
  },
  getLeaderboard: async (internshipId: string, params?: { limit?: number; offset?: number }) => {
    const response = await apiClient.get(`/rankings/internship/${internshipId}`, { params });
    return response.data;
  },
  getAnalytics: async (internshipId: string) => {
    const response = await apiClient.get(`/rankings/internship/${internshipId}/analytics`);
    return response.data;
  },
  rerank: async (internshipId: string) => {
    const response = await apiClient.post(`/rankings/internship/${internshipId}/rerank`);
    return response.data;
  },
  compare: async (applicationIds: string[]) => {
    const response = await apiClient.post('/rankings/compare', { application_ids: applicationIds });
    return response.data;
  },
};

export const dnaApi = {
  generate: async (applicationId: string) => {
    const response = await apiClient.post(`/dna/${applicationId}/generate`);
    return response.data;
  },
  get: async (applicationId: string) => {
    const response = await apiClient.get(`/dna/${applicationId}`);
    return response.data;
  },
  getRadar: async (applicationId: string) => {
    const response = await apiClient.get(`/dna/${applicationId}/radar`);
    return response.data;
  },
  getHistory: async (applicationId: string) => {
    const response = await apiClient.get(`/dna/${applicationId}/history`);
    return response.data;
  },
  compare: async (applicationIds: string[]) => {
    const response = await apiClient.post('/dna/compare', { application_ids: applicationIds });
    return response.data;
  },
};

export const integrityApi = {
  evaluate: async (applicationId: string) => {
    const response = await apiClient.post(`/integrity/${applicationId}/evaluate`);
    return response.data;
  },
  get: async (applicationId: string) => {
    const response = await apiClient.get(`/integrity/${applicationId}`);
    return response.data;
  },
  getCalibration: async () => {
    const response = await apiClient.get('/integrity/calibration');
    return response.data;
  },
  calibrate: async (weights: Record<string, number>) => {
    const response = await apiClient.post('/integrity/calibrate', weights);
    return response.data;
  },
};

export const reportsApi = {
  generate: async (
    applicationId: string,
    payload?: {
      summary?: string;
      strengths?: string[];
      weaknesses?: string[];
      recommendations?: string[];
    }
  ) => {
    const response = await apiClient.post(`/reports/${applicationId}/generate`, payload || {});
    return response.data;
  },
  get: async (applicationId: string) => {
    const response = await apiClient.get(`/reports/${applicationId}`);
    return response.data;
  },
  list: async () => {
    const appsRes = await apiClient.get<any[]>('/applications');
    const eligibleApps = appsRes.data.filter(app =>
      ['EVALUATED', 'SHORTLISTED', 'HIRED', 'REJECTED'].includes(app.status)
    );
    const reportPromises = eligibleApps.map(async (app) => {
      try {
        const reportData = await apiClient.get(`/reports/${app.id}`);
        return {
          id: reportData.data.id || `report-${app.id}`,
          application_id: app.id,
          candidate_name: app.candidate?.full_name || 'Candidate',
          internship_title: app.vacancy_title || app.vacancy?.title || 'General Vacancy',
          created_at: reportData.data.created_at || app.updated_at || app.created_at,
        };
      } catch (err) {
        return null;
      }
    });
    const results = await Promise.all(reportPromises);
    return results.filter((r): r is NonNullable<typeof r> => r !== null);
  },
  downloadUrl: (applicationId: string) => {
    const baseURL = apiClient.defaults.baseURL || 'http://localhost:8000/api/v1';
    return `${baseURL}/reports/${applicationId}/download`;
  },
};


