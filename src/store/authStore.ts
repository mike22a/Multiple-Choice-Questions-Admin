import { create } from 'zustand';

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
  setAuth: (token: string, profile: AdminProfile) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  profile: null,
  isAuthenticated: false,
  setAuth: (token, profile) => set({ token, profile, isAuthenticated: true }),
  clearAuth: () => set({ token: null, profile: null, isAuthenticated: false }),
}));
