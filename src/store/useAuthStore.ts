import { create } from 'zustand';

type User = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
};

type AuthState = {
  isAuthenticated: boolean;
  user?: User;
  login: (user: User) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: undefined,
  login: (user) => set({ isAuthenticated: true, user }),
  logout: () => set({ isAuthenticated: false, user: undefined }),
}));
