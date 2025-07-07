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
  initializeAuth: () => void;
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
            try {
              localStorage.setItem('authToken', token);
              console.log('✅ Token stored in localStorage');
            } catch (error) {
              console.error('❌ Failed to store token in localStorage:', error);
            }
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
            try {
              localStorage.setItem('authToken', token);
            } catch (error) {
              console.error('❌ Failed to update token in localStorage:', error);
            }
          }
          set({ token });
        },
        // Helper to sync token with localStorage on app start
        initializeAuth: () => {
          if (typeof window !== 'undefined') {
            try {
              const storedToken = localStorage.getItem('authToken');
              if (storedToken && storedToken.trim() !== '') {
                const state = useStore.getState();
                if (state.token !== storedToken) {
                  console.log('🔄 Syncing token from localStorage');
                  // Decode token to get user info
                  try {
                    const payload = JSON.parse(atob(storedToken.split('.')[1]));
                    const currentTime = Date.now() / 1000;
                    
                    if (payload.exp && payload.exp > currentTime) {
                      // Token is still valid, restore auth state
                      const user = {
                        id: payload.userId,
                        email: payload.email,
                        firstName: '', // Will be filled from API if needed
                        lastName: '', // Will be filled from API if needed
                        role: payload.role.toLowerCase(),
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        isActive: true,
                        vendorId: payload.vendorId,
                        teamId: payload.teamId,
                      };
                      
                      set({ 
                        token: storedToken, 
                        user: user,
                        isAuthenticated: true 
                      });
                      console.log('✅ Authentication restored from token');
                    } else {
                      // Token is expired, clear it
                      console.log('⚠️ Token expired, clearing auth state');
                      localStorage.removeItem('authToken');
                      set({ user: null, token: null, isAuthenticated: false });
                    }
                  } catch (error) {
                    console.error('❌ Failed to decode token:', error);
                    localStorage.removeItem('authToken');
                    set({ user: null, token: null, isAuthenticated: false });
                  }
                }
              }
            } catch (error) {
              console.error('❌ Failed to initialize auth from localStorage:', error);
            }
          }
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
