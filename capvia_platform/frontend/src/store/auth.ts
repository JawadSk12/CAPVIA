import { create } from 'zustand';

interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: 'candidate' | 'hr' | 'admin';
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (accessToken: string, refreshToken: string, user: AuthUser) => void;
  logout: () => void;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,

  login: (accessToken, refreshToken, user) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('capvia_access_token', accessToken);
      localStorage.setItem('capvia_refresh_token', refreshToken);
      localStorage.setItem('capvia_user', JSON.stringify(user));
    }
    set({ accessToken, refreshToken, user, isAuthenticated: true });
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('capvia_access_token');
      localStorage.removeItem('capvia_refresh_token');
      localStorage.removeItem('capvia_user');
    }
    set({ accessToken: null, refreshToken: null, user: null, isAuthenticated: false });
  },

  initialize: () => {
    if (typeof window !== 'undefined') {
      const accessToken = localStorage.getItem('capvia_access_token');
      const refreshToken = localStorage.getItem('capvia_refresh_token');
      const userStr = localStorage.getItem('capvia_user');
      
      if (accessToken && refreshToken && userStr) {
        try {
          const user = JSON.parse(userStr) as AuthUser;
          set({ accessToken, refreshToken, user, isAuthenticated: true });
        } catch (e) {
          // Clear corrupt storage
          localStorage.removeItem('capvia_access_token');
          localStorage.removeItem('capvia_refresh_token');
          localStorage.removeItem('capvia_user');
        }
      }
    }
  }
}));
