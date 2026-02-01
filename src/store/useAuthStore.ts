import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, AuthTokens } from '../utils/types';

type AuthState = {
  isAuthenticated: boolean;
  user?: User;
  tokens?: AuthTokens;
  login: (user: User, tokens: AuthTokens) => void;
  logout: () => void;
  setTokens: (tokens: AuthTokens) => void;
  getAccessToken: () => string | null;
  getRefreshToken: () => string | null;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      user: undefined,
      tokens: undefined,

      login: (user, tokens) => {
        localStorage.setItem('access_token', tokens.accessToken);
        localStorage.setItem('refresh_token', tokens.refreshToken);
        set({ isAuthenticated: true, user, tokens });
      },

      logout: () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        set({ isAuthenticated: false, user: undefined, tokens: undefined });
      },

      setTokens: (tokens) => {
        localStorage.setItem('access_token', tokens.accessToken);
        localStorage.setItem('refresh_token', tokens.refreshToken);
        set({ tokens });
      },

      getAccessToken: () => {
        return (
          get().tokens?.accessToken ?? localStorage.getItem('access_token')
        );
      },

      getRefreshToken: () => {
        return (
          get().tokens?.refreshToken ?? localStorage.getItem('refresh_token')
        );
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        tokens: state.tokens,
      }),
    },
  ),
);
