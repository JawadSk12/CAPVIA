import { create } from 'zustand';
import { Application } from '../types';

interface DashboardState {
  applications: Application[];
  selectedApplicationId: string | null;
  searchQuery: string;
  statusFilter: string;
  setApplications: (apps: Application[]) => void;
  setSelectedApplicationId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setStatusFilter: (filter: string) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  applications: [],
  selectedApplicationId: null,
  searchQuery: '',
  statusFilter: 'ALL',
  setApplications: (applications) => set({ applications }),
  setSelectedApplicationId: (selectedApplicationId) => set({ selectedApplicationId }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setStatusFilter: (statusFilter) => set({ statusFilter }),
}));
