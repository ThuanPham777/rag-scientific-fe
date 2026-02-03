// src/store/useMultiPaperChatStore.ts
// Store for managing multi-paper chat selection and state

import { create } from 'zustand';
import type { Paper, ChatMessage } from '../utils/types';

export interface MultiPaperSession {
  id: string; // Local client-side ID
  conversationId?: string; // Backend conversation ID (from database)
  paperIds: string[];
  papers: Paper[];
  messages: ChatMessage[];
}

interface MultiPaperChatState {
  // Selected papers for multi-chat
  selectedPapers: Paper[];

  // Current multi-paper session
  session: MultiPaperSession | null;

  // Loading state
  isLoading: boolean;

  // Actions
  selectPaper: (paper: Paper) => void;
  deselectPaper: (paperId: string) => void;
  togglePaper: (paper: Paper) => void;
  clearSelection: () => void;
  isSelected: (paperId: string) => boolean;

  // Session management
  setSession: (session: MultiPaperSession | null) => void;
  setConversationId: (conversationId: string) => void;
  addMessage: (message: ChatMessage) => void;
  setMessages: (messages: ChatMessage[]) => void;
  clearSession: () => void;

  // Loading
  setLoading: (loading: boolean) => void;
}

export const useMultiPaperChatStore = create<MultiPaperChatState>(
  (set, get) => ({
    selectedPapers: [],
    session: null,
    isLoading: false,

    selectPaper: (paper) => {
      const { selectedPapers } = get();
      if (!selectedPapers.find((p) => p.id === paper.id)) {
        set({ selectedPapers: [...selectedPapers, paper] });
      }
    },

    deselectPaper: (paperId) => {
      set((state) => ({
        selectedPapers: state.selectedPapers.filter((p) => p.id !== paperId),
      }));
    },

    togglePaper: (paper) => {
      const { selectedPapers } = get();
      const exists = selectedPapers.find((p) => p.id === paper.id);
      if (exists) {
        set({
          selectedPapers: selectedPapers.filter((p) => p.id !== paper.id),
        });
      } else {
        set({ selectedPapers: [...selectedPapers, paper] });
      }
    },

    clearSelection: () => {
      set({ selectedPapers: [] });
    },

    isSelected: (paperId) => {
      return get().selectedPapers.some((p) => p.id === paperId);
    },

    setSession: (session) => {
      set({ session });
    },

    setConversationId: (conversationId) => {
      set((state) => {
        if (!state.session) return state;
        return {
          session: {
            ...state.session,
            conversationId,
          },
        };
      });
    },

    addMessage: (message) => {
      set((state) => {
        if (!state.session) {
          // Create new session if none exists
          return {
            session: {
              id: crypto.randomUUID(),
              paperIds: state.selectedPapers.map((p) => p.id),
              papers: state.selectedPapers,
              messages: [message],
            },
          };
        }
        return {
          session: {
            ...state.session,
            messages: [...state.session.messages, message],
          },
        };
      });
    },

    setMessages: (messages) => {
      set((state) => {
        if (!state.session) return state;
        return {
          session: {
            ...state.session,
            messages,
          },
        };
      });
    },

    clearSession: () => {
      set({ session: null });
    },

    setLoading: (loading) => {
      set({ isLoading: loading });
    },
  }),
);
