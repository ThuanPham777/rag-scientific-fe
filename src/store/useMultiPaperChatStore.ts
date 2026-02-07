// src/store/useMultiPaperChatStore.ts
// UI/Client state ONLY - No legacy compatibility
// Server data (conversations, messages) is managed by React Query
// This store handles paper selection UI state and optimistic messages

import { create } from 'zustand';
import type { Paper, ChatMessage } from '../utils/types';

interface MultiPaperChatUIState {
  // Selected papers for multi-chat (UI selection state)
  selectedPapers: Paper[];

  // Current conversation ID (set from React Query data)
  currentConversationId: string | null;

  // Optimistic messages (for real-time chat experience)
  optimisticMessages: ChatMessage[];

  // Loading state
  isLoading: boolean;

  // Actions - Paper selection
  selectPaper: (paper: Paper) => void;
  deselectPaper: (paperId: string) => void;
  togglePaper: (paper: Paper) => void;
  clearSelection: () => void;
  isSelected: (paperId: string) => boolean;

  // Actions - Conversation
  setCurrentConversationId: (id: string | null) => void;

  // Actions - Optimistic messages
  addOptimisticMessage: (message: ChatMessage) => void;
  setOptimisticMessages: (messages: ChatMessage[]) => void;
  clearOptimisticMessages: () => void;

  // Actions - Loading
  setLoading: (loading: boolean) => void;

  // Actions - Reset
  reset: () => void;
}

export const useMultiPaperChatStore = create<MultiPaperChatUIState>(
  (set, get) => ({
    // UI state
    selectedPapers: [],
    currentConversationId: null,
    optimisticMessages: [],
    isLoading: false,

    // Paper selection actions
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

    // Conversation actions
    setCurrentConversationId: (id) => set({ currentConversationId: id }),

    // Message actions
    addOptimisticMessage: (message) =>
      set((state) => ({
        optimisticMessages: [...state.optimisticMessages, message],
      })),

    setOptimisticMessages: (messages) => set({ optimisticMessages: messages }),

    clearOptimisticMessages: () => set({ optimisticMessages: [] }),

    // Loading actions
    setLoading: (loading) => set({ isLoading: loading }),

    // Reset action
    reset: () =>
      set({
        selectedPapers: [],
        currentConversationId: null,
        optimisticMessages: [],
        isLoading: false,
      }),
  }),
);

// Helper type for session-like object (used by components)
export interface MultiPaperSessionData {
  conversationId: string | null;
  paperIds: string[];
  papers: Paper[];
  messages: ChatMessage[];
}

// Selector to get session-like object from store state
export const selectMultiPaperSession = (
  state: MultiPaperChatUIState,
): MultiPaperSessionData => ({
  conversationId: state.currentConversationId,
  paperIds: state.selectedPapers.map((p) => p.id),
  papers: state.selectedPapers,
  messages: state.optimisticMessages,
});
