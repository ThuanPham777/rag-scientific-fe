import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, AuthTokens } from '../utils/types';
import { useGuestStore } from './useGuestStore';

// =====================================================
// In-memory access token storage (NOT persisted)
// This is more secure - access token is never in localStorage
// =====================================================
let inMemoryAccessToken: string | null = null;

type AuthState = {
  isAuthenticated: boolean;
  isInitialized: boolean; // Has auth been checked on app load?
  user?: User;
  // Only refresh token is persisted (for session restoration)
  refreshToken?: string;
  login: (user: User, tokens: AuthTokens) => void;
  logout: () => void;
  setTokens: (tokens: AuthTokens) => void;
  getAccessToken: () => string | null;
  getRefreshToken: () => string | null;
  setAccessToken: (token: string) => void;
  clearTokens: () => void;
  setInitialized: (initialized: boolean) => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      isInitialized: false,
      user: undefined,
      refreshToken: undefined,

      login: (user, tokens) => {
        // Access token stored in memory only (more secure)
        inMemoryAccessToken = tokens.accessToken;
        // Clear guest data when user logs in
        useGuestStore.getState().clearGuestData();
        // Refresh token persisted for session restoration
        set({
          isAuthenticated: true,
          isInitialized: true,
          user,
          refreshToken: tokens.refreshToken,
        });
      },

      logout: () => {
        // Clear in-memory access token
        inMemoryAccessToken = null;
        // Clear persisted state
        set({
          isAuthenticated: false,
          isInitialized: true, // Keep initialized as true
          user: undefined,
          refreshToken: undefined,
        });
      },

      setTokens: (tokens) => {
        // Update access token in memory
        inMemoryAccessToken = tokens.accessToken;
        // Update refresh token in persisted state
        set({ refreshToken: tokens.refreshToken, isInitialized: true });
      },

      setAccessToken: (token) => {
        inMemoryAccessToken = token;
      },

      getAccessToken: () => {
        return inMemoryAccessToken;
      },

      getRefreshToken: () => {
        return get().refreshToken ?? null;
      },

      clearTokens: () => {
        inMemoryAccessToken = null;
        set({ refreshToken: undefined });
      },

      setInitialized: (initialized) => {
        set({ isInitialized: initialized });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        // Only persist refresh token, NOT access token
        refreshToken: state.refreshToken,
        // Don't persist isInitialized - should always start as false
      }),
    },
  ),
);
