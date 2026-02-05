// src/store/usePaperStore.ts
// UI/Client state ONLY - No legacy compatibility
// Server data (papers list, conversations) is managed by React Query
// This store handles UI state like current selection, navigation, and loading states

import { create } from 'zustand';
import type { ChatMessage, Paper } from '../utils/types';

interface PaperUIState {
  // Current paper being viewed (set from React Query data)
  currentPaperId: string | null;
  currentPaper: Paper | null;

  // Current conversation/session ID (set from React Query data)
  currentConversationId: string | null;

  // Session metadata (title, ragFileId, paperId for current session)
  sessionMeta: {
    paperId?: string;
    ragFileId?: string;
    title?: string;
  } | null;

  // Optimistic messages (for real-time chat experience)
  // These are merged with server messages from React Query
  optimisticMessages: ChatMessage[];

  // Pending jump to page/rect (for citation navigation)
  pendingJump: {
    pageNumber: number;
    rect?: { top: number; left: number; width: number; height: number };
  } | null;

  // Chat loading state (for optimistic UI)
  isChatLoading: boolean;

  // Actions - Paper selection
  setCurrentPaperId: (id: string | null) => void;
  setCurrentPaper: (paper: Paper | null) => void;
  updateCurrentPaper: (partial: Partial<Paper>) => void;

  // Actions - Conversation/Session selection
  setCurrentConversationId: (id: string | null) => void;
  setSession: (session: {
    id: string;
    paperId?: string;
    ragFileId?: string;
    title?: string;
    messages?: ChatMessage[];
  }) => void;

  // Actions - Optimistic messages (for chat UI)
  addOptimisticMessage: (msg: ChatMessage) => void;
  updateOptimisticMessage: (id: string, partial: Partial<ChatMessage>) => void;
  clearOptimisticMessages: () => void;
  setOptimisticMessages: (messages: ChatMessage[]) => void;

  // Actions - Navigation
  setPendingJump: (
    jump: {
      pageNumber: number;
      rect?: { top: number; left: number; width: number; height: number };
    } | null,
  ) => void;

  // Actions - Loading state
  setChatLoading: (loading: boolean) => void;

  // Actions - Reset
  reset: () => void;
  resetSession: () => void;
}

export const usePaperStore = create<PaperUIState>((set) => ({
  // UI state
  currentPaperId: null,
  currentPaper: null,
  currentConversationId: null,
  sessionMeta: null,
  optimisticMessages: [],
  pendingJump: null,
  isChatLoading: false,

  // Paper actions
  setCurrentPaperId: (id) => set({ currentPaperId: id }),

  setCurrentPaper: (paper) =>
    set({ currentPaper: paper, currentPaperId: paper?.id ?? null }),

  updateCurrentPaper: (partial) =>
    set((s) => ({
      currentPaper: s.currentPaper ? { ...s.currentPaper, ...partial } : null,
    })),

  // Session/Conversation actions
  setCurrentConversationId: (id) => set({ currentConversationId: id }),

  setSession: (session) =>
    set({
      currentConversationId: session.id,
      sessionMeta: {
        paperId: session.paperId,
        ragFileId: session.ragFileId,
        title: session.title,
      },
      optimisticMessages: session.messages ?? [],
    }),

  // Message actions
  addOptimisticMessage: (msg) =>
    set((s) => ({ optimisticMessages: [...s.optimisticMessages, msg] })),

  updateOptimisticMessage: (id, partial) =>
    set((s) => ({
      optimisticMessages: s.optimisticMessages.map((m) =>
        m.id === id ? { ...m, ...partial } : m,
      ),
    })),

  clearOptimisticMessages: () => set({ optimisticMessages: [] }),

  setOptimisticMessages: (messages) => set({ optimisticMessages: messages }),

  // Navigation actions
  setPendingJump: (jump) => set({ pendingJump: jump }),

  // Loading state
  setChatLoading: (loading) => set({ isChatLoading: loading }),

  // Reset actions
  reset: () =>
    set({
      currentPaperId: null,
      currentPaper: null,
      currentConversationId: null,
      sessionMeta: null,
      optimisticMessages: [],
      pendingJump: null,
      isChatLoading: false,
    }),

  resetSession: () =>
    set({
      currentConversationId: null,
      sessionMeta: null,
      optimisticMessages: [],
      pendingJump: null,
      isChatLoading: false,
    }),
}));

// Helper type for session object (used by components)
export interface SessionData {
  id: string;
  paperId?: string;
  ragFileId?: string;
  title?: string;
  messages: ChatMessage[];
}

// Selector to get session-like object from store state
export const selectSession = (state: PaperUIState): SessionData | null => {
  if (!state.currentConversationId) return null;
  return {
    id: state.currentConversationId,
    paperId: state.sessionMeta?.paperId,
    ragFileId: state.sessionMeta?.ragFileId,
    title: state.sessionMeta?.title,
    messages: state.optimisticMessages,
  };
};
