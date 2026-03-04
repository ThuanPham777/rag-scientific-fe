import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../utils/types';
import { disconnectSocket } from '../services/socket';

// =====================================================
// In-memory access token storage (NOT persisted)
// This is more secure - access token is never in localStorage
// =====================================================
let inMemoryAccessToken: string | null = null;

type AuthState = {
  isAuthenticated: boolean;
  isInitialized: boolean; // Has auth been checked on app load?
  user?: User;
  // refreshToken is stored server-side as HTTP-only cookie — NOT in client state
  login: (user: User, accessToken: string) => void;
  logout: () => void;
  setAccessToken: (token: string) => void;
  getAccessToken: () => string | null;
  clearTokens: () => void;
  setInitialized: (initialized: boolean) => void;
  setUser: (user: User) => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, _get) => ({
      isAuthenticated: false,
      isInitialized: false,
      user: undefined,

      login: (user, accessToken) => {
        // Access token stored in memory only (never persisted)
        inMemoryAccessToken = accessToken;
        // NOTE: Do NOT clear guest data here.
        // Guest data is cleared by useGuestMigration AFTER successful migration.
        // Clearing it here would destroy paper/messages before they can be persisted to DB.

        set({
          isAuthenticated: true,
          isInitialized: true,
          user,
        });
      },

      logout: () => {
        // Disconnect WebSocket before clearing auth
        disconnectSocket();
        // Clear in-memory access token
        inMemoryAccessToken = null;
        // Clear persisted state
        set({
          isAuthenticated: false,
          isInitialized: true, // Keep initialized as true
          user: undefined,
        });
      },

      setAccessToken: (token) => {
        inMemoryAccessToken = token;
      },

      getAccessToken: () => {
        return inMemoryAccessToken;
      },

      clearTokens: () => {
        inMemoryAccessToken = null;
      },

      setInitialized: (initialized) => {
        set({ isInitialized: initialized });
      },

      setUser: (user) => {
        set({ user });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        // Only persist non-sensitive state for UI restoration
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        // NO tokens persisted — access token is memory-only,
        // refresh token is HTTP-only cookie (server-managed)
      }),
    },
  ),
);
