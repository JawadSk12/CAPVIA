import axios, { AxiosError, AxiosInstance } from 'axios';
import { toast } from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class ApiClient {
    private client: AxiosInstance;

    constructor() {
        const baseRoute = API_BASE_URL.endsWith('/api/v1') ? API_BASE_URL : `${API_BASE_URL}/api/v1`;
        this.client = axios.create({
            baseURL: baseRoute,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        this.setupInterceptors();
    }

    private setupInterceptors() {
        // Request interceptor - add auth token
        this.client.interceptors.request.use(
            (config) => {
                const token = localStorage.getItem('access_token');
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                return config;
            },
            (error) => {
                return Promise.reject(error);
            }
        );

        // Response interceptor - handle errors
        this.client.interceptors.response.use(
            (response) => response,
            async (error: AxiosError<any>) => {
                const originalRequest = error.config as any;

                // Handle 401 Unauthorized
                if (error.response?.status === 401 && !originalRequest._retry) {
                    originalRequest._retry = true;

                    try {
                        // Try to refresh token
                        const refreshToken = localStorage.getItem('refresh_token');
                        if (refreshToken) {
                            const refreshBase = API_BASE_URL.endsWith('/api/v1') ? API_BASE_URL : `${API_BASE_URL}/api/v1`;
                            const response = await axios.post(
                                `${refreshBase}/auth/refresh`,
                                { refresh_token: refreshToken }
                            );

                            const { access_token, refresh_token: newRefreshToken } = response.data;
                            localStorage.setItem('access_token', access_token);
                            localStorage.setItem('refresh_token', newRefreshToken);

                            // Retry original request
                            originalRequest.headers.Authorization = `Bearer ${access_token}`;
                            return this.client(originalRequest);
                        }
                    } catch (refreshError) {
                        // Refresh failed - logout
                        localStorage.removeItem('access_token');
                        localStorage.removeItem('refresh_token');
                        localStorage.removeItem('user');
                        window.location.href = '/login';
                        return Promise.reject(refreshError);
                    }
                }

                // Handle other errors
                this.handleError(error);
                return Promise.reject(error);
            }
        );
    }

    private handleError(error: AxiosError<any>) {
        if (error.response) {
            const message = error.response.data?.message || error.response.data?.detail || 'An error occurred';
            toast.error(message);
        } else if (error.request) {
            toast.error('Network error. Please check your connection.');
        } else {
            toast.error('An unexpected error occurred.');
        }
    }

    public getClient(): AxiosInstance {
        return this.client;
    }
}

export const apiClient = new ApiClient().getClient();