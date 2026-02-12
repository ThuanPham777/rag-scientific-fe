// src/store/useMultiPaperChatStore.ts
// UI/Client state ONLY - No legacy compatibility
// Server data (conversations, messages) is managed by React Query
// This store handles paper selection UI state and loading/conversation ID

import { create } from 'zustand';
import type { Paper } from '../utils/types';

interface MultiPaperChatUIState {
  // Selected papers for multi-chat (UI selection state)
  selectedPapers: Paper[];

  // Current conversation ID (set from React Query data)
  currentConversationId: string | null;

  // Loading state
  isLoading: boolean;

  // Actions - Paper selection
  selectPaper: (paper: Paper) => void;
  deselectPaper: (paperId: string) => void;
  togglePaper: (paper: Paper) => void;
  setSelectedPapers: (papers: Paper[]) => void;
  clearSelection: () => void;
  isSelected: (paperId: string) => boolean;

  // Actions - Conversation
  setCurrentConversationId: (id: string | null) => void;

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

    setSelectedPapers: (papers) => {
      set({ selectedPapers: papers });
    },

    clearSelection: () => {
      set({ selectedPapers: [] });
    },

    isSelected: (paperId) => {
      return get().selectedPapers.some((p) => p.id === paperId);
    },

    // Conversation actions
    setCurrentConversationId: (id) => set({ currentConversationId: id }),

    // Loading actions
    setLoading: (loading) => set({ isLoading: loading }),

    // Reset action
    reset: () =>
      set({
        selectedPapers: [],
        currentConversationId: null,
        isLoading: false,
      }),
  }),
);
