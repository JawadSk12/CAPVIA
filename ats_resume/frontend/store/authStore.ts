/**
 * frontend/store/authStore.ts
 * ────────────────────────────
 * Zustand store for authentication state.
 * Access token is NOT persisted — stored in memory only (XSS-safe).
 * Refresh token lives in httpOnly cookie (managed by browser).
 * User info is persisted to sessionStorage (cleared on tab close).
 */

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { persist, createJSONStorage } from "zustand/middleware";
import { authApi, tokenStore, type RegisterPayload } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  full_name: string | null;
  role: "STUDENT" | "HR" | "ADMIN";
  is_active: boolean;
  is_email_verified: boolean;
  created_at: string;
  last_login_at: string | null;
  avatar_url: string | null;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  /** Login with email + password. Returns the user object on success. */
  login: (email: string, password: string) => Promise<AuthUser>;
  /** Register a new account. Accepts an object payload. Returns the user. */
  register: (payload: RegisterPayload) => Promise<AuthUser>;
  logout: () => Promise<void>;
  loadMe: () => Promise<void>;
  clearError: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    immer((set) => ({
      // ── Initial State ────────────────────────────────────────────────────
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // ── Actions ──────────────────────────────────────────────────────────

      login: async (email, password) => {
        set((s) => { s.isLoading = true; s.error = null; });
        try {
          const response = await authApi.login({ email, password });
          const user = response.user as AuthUser;
          set((s) => {
            s.user = user;
            s.isAuthenticated = true;
            s.isLoading = false;
          });
          return user;
        } catch (err: any) {
          const detail = err?.response?.data?.detail;
          const msg = Array.isArray(detail) 
            ? detail[0]?.msg 
            : typeof detail === 'string' 
              ? detail 
              : "Login failed";
          set((s) => {
            s.error = msg;
            s.isLoading = false;
          });
          throw err;
        }
      },

      register: async (payload) => {
        set((s) => { s.isLoading = true; s.error = null; });
        try {
          const response = await authApi.register(payload);
          const user = response.user as AuthUser;
          set((s) => {
            s.user = user;
            s.isAuthenticated = true;
            s.isLoading = false;
          });
          return user;
        } catch (err: any) {
          const detail = err?.response?.data?.detail;
          const msg = Array.isArray(detail) 
            ? detail[0]?.msg 
            : typeof detail === 'string' 
              ? detail 
              : "Registration failed";
          set((s) => {
            s.error = msg;
            s.isLoading = false;
          });
          throw err;
        }
      },

      logout: async () => {
        try {
          await authApi.logout();
        } finally {
          tokenStore.clear();
          set((s) => { s.user = null; s.isAuthenticated = false; });
        }
      },

      loadMe: async () => {
        set((s) => { s.isLoading = true; });
        try {
          const user = await authApi.me();
          set((s) => {
            s.user = user;
            s.isAuthenticated = true;
            s.isLoading = false;
          });
        } catch {
          set((s) => {
            s.user = null;
            s.isAuthenticated = false;
            s.isLoading = false;
          });
        }
      },

      clearError: () => set((s) => { s.error = null; }),
    })),
    {
      name: "capvia-auth",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? sessionStorage : localStorage
      ),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

// ─── Selectors ────────────────────────────────────────────────────────────────

export const useIsHR      = () => useAuthStore((s) => s.user?.role === "HR" || s.user?.role === "ADMIN");
export const useIsStudent = () => useAuthStore((s) => s.user?.role === "STUDENT");
export const useIsAdmin   = () => useAuthStore((s) => s.user?.role === "ADMIN");