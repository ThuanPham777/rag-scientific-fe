// src/store/useGuestStore.ts
// Store for guest (non-authenticated) user sessions
// Data is persisted to localStorage so it survives page refresh

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ChatMessage } from '../utils/types';

export interface GuestPaper {
  id: string;
  ragFileId: string;
  fileName: string;
  fileUrl: string; // S3 URL for the PDF
  createdAt: string;
  status?: 'PROCESSING' | 'COMPLETED' | 'FAILED'; // For background ingest
}

export interface GuestSession {
  id: string;
  paperId: string;
  ragFileId: string;
  messages: ChatMessage[];
  createdAt: string;
}

// Pending jump type for citation highlighting
export interface GuestPendingJump {
  pageNumber: number;
  rect?: { top: number; left: number; width: number; height: number };
}

interface GuestState {
  // Current active paper and session
  currentPaper: GuestPaper | null;
  currentSession: GuestSession | null;
  isLoading: boolean;
  pendingJump: GuestPendingJump | null;

  // Actions
  setGuestPaper: (paper: GuestPaper) => void;
  updateGuestPaper: (partial: Partial<GuestPaper>) => void;
  setGuestSession: (session: GuestSession) => void;
  addGuestMessage: (message: ChatMessage) => void;
  setGuestMessages: (messages: ChatMessage[]) => void;
  setLoading: (loading: boolean) => void;
  setPendingJump: (jump: GuestPendingJump | null) => void;
  clearGuestData: () => void;
}

// Generate IDs (same format as authenticated users)
export const generateGuestPaperId = () => crypto.randomUUID();
export const generateGuestSessionId = () => crypto.randomUUID();

export const useGuestStore = create<GuestState>()(
  persist(
    (set) => ({
      currentPaper: null,
      currentSession: null,
      isLoading: false,
      pendingJump: null,

      setGuestPaper: (paper) => set({ currentPaper: paper }),

      updateGuestPaper: (partial) =>
        set((state) => {
          if (!state.currentPaper) return state;
          return {
            currentPaper: { ...state.currentPaper, ...partial },
          };
        }),

      setGuestSession: (session) => set({ currentSession: session }),

      addGuestMessage: (message) =>
        set((state) => {
          if (!state.currentSession) return state;
          return {
            currentSession: {
              ...state.currentSession,
              messages: [...state.currentSession.messages, message],
            },
          };
        }),

      setGuestMessages: (messages) =>
        set((state) => {
          if (!state.currentSession) return state;
          return {
            currentSession: {
              ...state.currentSession,
              messages,
            },
          };
        }),

      clearGuestData: () =>
        set({
          currentPaper: null,
          currentSession: null,
          isLoading: false,
          pendingJump: null,
        }),

      setLoading: (loading) => set({ isLoading: loading }),

      setPendingJump: (jump) => set({ pendingJump: jump }),
    }),
    {
      name: 'guest-storage', // localStorage key
      storage: createJSONStorage(() => localStorage),
      // Only persist data, not methods
      partialize: (state) => ({
        currentPaper: state.currentPaper,
        currentSession: state.currentSession,
      }),
    },
  ),
);

// Helper to check if current session is a guest session (check localStorage)
export const isGuestSession = (sessionId: string): boolean => {
  const guestStore = useGuestStore.getState();
  return guestStore.currentSession?.id === sessionId;
};
