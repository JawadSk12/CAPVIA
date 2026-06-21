'use client';

import { create } from 'zustand';
import { Internship, InternshipAnalytics, InternshipFilters } from '../types';

interface InternshipState {
  internships: Internship[];
  currentInternship: Internship | null;
  analytics: InternshipAnalytics | null;
  total: number;
  page: number;
  perPage: number;
  filters: InternshipFilters;
  isLoading: boolean;
  error: string | null;

  setInternships: (internships: Internship[], total: number, page: number, perPage: number) => void;
  setCurrentInternship: (i: Internship | null) => void;
  setAnalytics: (a: InternshipAnalytics | null) => void;
  setFilters: (filters: Partial<InternshipFilters>) => void;
  clearFilters: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  updateInternshipInList: (updated: Internship) => void;
  removeInternshipFromList: (id: string) => void;
  clear: () => void;
}

export const useInternshipStore = create<InternshipState>((set) => ({
  internships: [],
  currentInternship: null,
  analytics: null,
  total: 0,
  page: 1,
  perPage: 20,
  filters: {},
  isLoading: false,
  error: null,

  setInternships: (internships, total, page, perPage) =>
    set({ internships, total, page, perPage }),

  setCurrentInternship: (currentInternship) => set({ currentInternship }),

  setAnalytics: (analytics) => set({ analytics }),

  setFilters: (newFilters) =>
    set((state) => ({ filters: { ...state.filters, ...newFilters } })),

  clearFilters: () => set({ filters: {} }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  updateInternshipInList: (updated) =>
    set((state) => ({
      internships: state.internships.map((i) => (i.id === updated.id ? updated : i)),
      currentInternship: state.currentInternship?.id === updated.id ? updated : state.currentInternship,
    })),

  removeInternshipFromList: (id) =>
    set((state) => ({
      internships: state.internships.filter((i) => i.id !== id),
      currentInternship: state.currentInternship?.id === id ? null : state.currentInternship,
    })),

  clear: () =>
    set({ currentInternship: null, analytics: null, error: null }),
}));
