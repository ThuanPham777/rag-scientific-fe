import { create } from "zustand";
import type { ChatMessage, Paper, Session } from "../utils/types";

interface PaperState {
  paper?: Paper;
  session?: Session;
  setPaper: (p: Paper) => void;
  updatePaper: (p: Partial<Paper>) => void;
  setSession: (s: Session) => void;
  addMessage: (m: ChatMessage) => void;
  reset: () => void;
}

export const usePaperStore = create<PaperState>((set, get) => ({
  paper: undefined,
  session: undefined,

  // set paper mới
  setPaper: (paper) => set({ paper }),

  // cập nhật thông tin (ví dụ khi tải xong context, update size,...)
  updatePaper: (p) =>
    set((s) => (s.paper ? { paper: { ...s.paper, ...p } } : {})),

  // set session mới
  setSession: (session) => set({ session }),

  // thêm message chat mới
  addMessage: (m) =>
    set((s) => ({
      session: s.session
        ? { ...s.session, messages: [...s.session.messages, m] }
        : undefined,
    })),

  // reset lại state
  reset: () => set({ paper: undefined, session: undefined }),
}));
