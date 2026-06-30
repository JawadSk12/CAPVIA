import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: number;
  email: string;
  full_name: string | null;
  username: string | null;
  role: 'hr' | 'candidate' | 'super_admin';
  is_verified: boolean;
  is_active: boolean;
  organization: string | null;
  position: string | null;
  skills: string[] | null;
  resume_url: string | null;
  bio: string | null;
  linkedin_url: string | null;
  years_of_experience: string | null;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  setUser: (user: User | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken, isAuthenticated: true }),
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      logout: () => {
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
        localStorage.removeItem('auth-storage');
      },
    }),
    { name: 'auth-storage' }
  )
);