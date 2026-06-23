import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AdminProfile {
  id: string;
  email: string;
  fullName: string;
  username: string;
  role: 'superadmin' | 'admin';
}

interface AuthState {
  token: string | null;
  profile: AdminProfile | null;
  isAuthenticated: boolean;
  sessionExpired: boolean;
  setAuth: (token: string, profile: AdminProfile) => void;
  clearAuth: () => void;
  setSessionExpired: (expired: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      profile: null,
      isAuthenticated: false,
      sessionExpired: false,
      setAuth: (token, profile) => set({ token, profile, isAuthenticated: true, sessionExpired: false }),
      clearAuth: () => set({ token: null, profile: null, isAuthenticated: false }),
      setSessionExpired: (sessionExpired) => set({ sessionExpired }),
    }),
    {
      name: 'mcq-admin-auth',
      // do not persist sessionExpired state to localStorage
      partialize: (state) => ({
        token: state.token,
        profile: state.profile,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
