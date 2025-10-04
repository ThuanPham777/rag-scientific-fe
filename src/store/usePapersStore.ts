import { create } from 'zustand';
import type { ChatMessage, Paper, Session } from '../utils/types';

interface PapersState {
  papers: Paper[];
  session?: Session;
  setPapers: (papers: Paper[]) => void;
  upsertPaper: (p: Paper) => void;
  setSession: (s: Session) => void;
  addMessage: (m: ChatMessage) => void;
  setActivePaper: (paperId: string) => void;
  reset: () => void;
}

export const usePapersStore = create<PapersState>((set, get) => ({
  papers: [],
  session: undefined,
  setPapers: (papers) => set({ papers }),
  upsertPaper: (p) =>
    set((s) => {
      const i = s.papers.findIndex((x) => x.id === p.id);
      if (i >= 0) {
        const cp = [...s.papers];
        cp[i] = { ...cp[i], ...p };
        return { papers: cp };
      }
      return { papers: [...s.papers, p] };
    }),
  setSession: (session) => set({ session }),
  addMessage: (m) =>
    set((s) => ({
      session: s.session
        ? { ...s.session, messages: [...s.session.messages, m] }
        : undefined,
    })),
  setActivePaper: (paperId) =>
    set((s) =>
      s.session ? { session: { ...s.session, activePaperId: paperId } } : {}
    ),
  reset: () => set({ papers: [], session: undefined }),
}));
