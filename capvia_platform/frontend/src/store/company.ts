'use client';

import { create } from 'zustand';
import { Company, CompanyAnalytics, CompanyMember } from '../types';

interface CompanyState {
  companies: Company[];
  currentCompany: Company | null;
  analytics: CompanyAnalytics | null;
  members: CompanyMember[];
  total: number;
  page: number;
  perPage: number;
  isLoading: boolean;
  error: string | null;

  setCompanies: (companies: Company[], total: number, page: number, perPage: number) => void;
  setCurrentCompany: (company: Company | null) => void;
  setAnalytics: (analytics: CompanyAnalytics | null) => void;
  setMembers: (members: CompanyMember[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearCompany: () => void;
  updateCompanyInList: (updated: Company) => void;
  removeCompanyFromList: (id: string) => void;
}

export const useCompanyStore = create<CompanyState>((set) => ({
  companies: [],
  currentCompany: null,
  analytics: null,
  members: [],
  total: 0,
  page: 1,
  perPage: 20,
  isLoading: false,
  error: null,

  setCompanies: (companies, total, page, perPage) =>
    set({ companies, total, page, perPage }),

  setCurrentCompany: (company) =>
    set({ currentCompany: company }),

  setAnalytics: (analytics) =>
    set({ analytics }),

  setMembers: (members) =>
    set({ members }),

  setLoading: (isLoading) =>
    set({ isLoading }),

  setError: (error) =>
    set({ error }),

  clearCompany: () =>
    set({ currentCompany: null, analytics: null, members: [], error: null }),

  updateCompanyInList: (updated) =>
    set((state) => ({
      companies: state.companies.map((c) => (c.id === updated.id ? updated : c)),
      currentCompany: state.currentCompany?.id === updated.id ? updated : state.currentCompany,
    })),

  removeCompanyFromList: (id) =>
    set((state) => ({
      companies: state.companies.filter((c) => c.id !== id),
      currentCompany: state.currentCompany?.id === id ? null : state.currentCompany,
    })),
}));
