import { create } from 'zustand';
import type {
  ChatMessage,
  Paper,
  ChatSession,
  Conversation,
} from '../utils/types';

interface PaperState {
  // Current paper being viewed
  paper?: Paper;
  // Current chat session (conversation)
  session?: ChatSession;
  // List of user's papers
  papers: Paper[];
  // List of conversations for current paper
  conversations: Conversation[];
  // Pending jump to page/rect
  pendingJump?: {
    pageNumber: number;
    rect?: { top: number; left: number; width: number; height: number };
  } | null;
  // Chat loading state (global)
  isChatLoading: boolean;

  // Paper actions
  setPaper: (p: Paper) => void;
  updatePaper: (p: Partial<Paper>) => void;
  setPapers: (papers: Paper[]) => void;
  addPaper: (paper: Paper) => void;
  removePaper: (id: string) => void;

  // Session/Conversation actions
  setSession: (s: ChatSession) => void;
  setConversations: (convs: Conversation[]) => void;
  addConversation: (conv: Conversation) => void;

  // Message actions
  addMessage: (m: ChatMessage) => void;
  updateMessage: (id: string, partial: Partial<ChatMessage>) => void;
  setMessages: (messages: ChatMessage[]) => void;

  // Navigation
  setPendingJump: (
    jump: {
      pageNumber: number;
      rect?: { top: number; left: number; width: number; height: number };
    } | null,
  ) => void;

  // Loading state
  setChatLoading: (loading: boolean) => void;

  // Reset
  reset: () => void;
  resetSession: () => void;
}

export const usePaperStore = create<PaperState>((set) => ({
  paper: undefined,
  session: undefined,
  papers: [],
  conversations: [],
  pendingJump: null,
  isChatLoading: false,

  // Paper actions
  setPaper: (paper) => set({ paper }),

  updatePaper: (p) =>
    set((s) => (s.paper ? { paper: { ...s.paper, ...p } } : {})),

  setPapers: (papers) => set({ papers }),

  addPaper: (paper) => set((s) => ({ papers: [paper, ...s.papers] })),

  removePaper: (id) =>
    set((s) => ({ papers: s.papers.filter((p) => p.id !== id) })),

  // Session/Conversation actions
  setSession: (session) => set({ session }),

  setConversations: (conversations) => set({ conversations }),

  addConversation: (conv) =>
    set((s) => ({ conversations: [conv, ...s.conversations] })),

  // Message actions
  addMessage: (m) =>
    set((s) => ({
      session: s.session
        ? { ...s.session, messages: [...s.session.messages, m] }
        : undefined,
    })),

  updateMessage: (id, partial) =>
    set((s) => {
      if (!s.session) return {};
      const next = s.session.messages.map((msg) =>
        msg.id === id ? { ...msg, ...partial } : msg,
      );
      return { session: { ...s.session, messages: next } };
    }),

  setMessages: (messages) =>
    set((s) => ({
      session: s.session ? { ...s.session, messages } : undefined,
    })),

  // Navigation
  setPendingJump: (jump) => set({ pendingJump: jump }),

  // Loading state
  setChatLoading: (loading) => set({ isChatLoading: loading }),

  // Reset
  reset: () =>
    set({
      paper: undefined,
      session: undefined,
      papers: [],
      conversations: [],
      pendingJump: null,
      isChatLoading: false,
    }),

  resetSession: () =>
    set({ session: undefined, pendingJump: null, isChatLoading: false }),
}));
