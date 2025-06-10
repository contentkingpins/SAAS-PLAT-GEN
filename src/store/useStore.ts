import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { User, Lead, DashboardMetrics } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  setToken: (token: string) => void;
}

interface LeadState {
  leads: Lead[];
  currentLead: Lead | null;
  isLoading: boolean;
  error: string | null;
  setLeads: (leads: Lead[]) => void;
  setCurrentLead: (lead: Lead | null) => void;
  updateLead: (id: string, updates: Partial<Lead>) => void;
  addLead: (lead: Lead) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

interface DashboardState {
  metrics: DashboardMetrics | null;
  isLoading: boolean;
  setMetrics: (metrics: DashboardMetrics) => void;
  setLoading: (loading: boolean) => void;
}

interface WebSocketState {
  isConnected: boolean;
  setConnected: (connected: boolean) => void;
}

interface AppState extends AuthState, LeadState, DashboardState, WebSocketState {}

const useStore = create<AppState>()(
  devtools(
    persist(
      (set) => ({
        // Auth State
        user: null,
        token: null,
        isAuthenticated: false,
        login: (user, token) => {
          // Store token in localStorage for API client
          if (typeof window !== 'undefined') {
            localStorage.setItem('authToken', token);
          }
          set({ user, token, isAuthenticated: true });
        },
        logout: () => {
          // Clear token from localStorage
          if (typeof window !== 'undefined') {
            localStorage.removeItem('authToken');
          }
          set({ user: null, token: null, isAuthenticated: false });
        },
        setToken: (token) => {
          // Update token in localStorage
          if (typeof window !== 'undefined') {
            localStorage.setItem('authToken', token);
          }
          set({ token });
        },

        // Lead State
        leads: [],
        currentLead: null,
        isLoading: false,
        error: null,
        setLeads: (leads) => set({ leads }),
        setCurrentLead: (currentLead) => set({ currentLead }),
        updateLead: (id, updates) =>
          set((state) => ({
            leads: state.leads.map((lead) =>
              lead.id === id ? { ...lead, ...updates } : lead
            ),
            currentLead:
              state.currentLead?.id === id
                ? { ...state.currentLead, ...updates }
                : state.currentLead,
          })),
        addLead: (lead) =>
          set((state) => ({ leads: [lead, ...state.leads] })),
        setLoading: (isLoading) => set({ isLoading }),
        setError: (error) => set({ error }),

        // Dashboard State
        metrics: null,
        setMetrics: (metrics) => set({ metrics }),

        // WebSocket State
        isConnected: false,
        setConnected: (isConnected) => set({ isConnected }),
      }),
      {
        name: 'healthcare-storage',
        partialize: (state) => ({
          user: state.user,
          token: state.token,
          isAuthenticated: state.isAuthenticated
        }),
      }
    )
  )
);

export default useStore;
