import { create } from "zustand";
import type { ChatMessage, Paper, Session } from "../utils/types";

interface PaperState {
  paper?: Paper;
  session?: Session;
  pendingJump?: { pageNumber: number } | null;
  setPaper: (p: Paper) => void;
  updatePaper: (p: Partial<Paper>) => void;
  setSession: (s: Session) => void;
  addMessage: (m: ChatMessage) => void;
  updateMessage: (id: string, partial: Partial<ChatMessage>) => void;
  setPendingJump: (jump: { pageNumber: number } | null) => void;
  reset: () => void;
}

export const usePaperStore = create<PaperState>((set) => ({
  paper: undefined,
  session: undefined,
  pendingJump: null,

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

  // cập nhật message theo id
  updateMessage: (id, partial) =>
    set((s) => {
      if (!s.session) return {};
      const next = s.session.messages.map((msg) =>
        msg.id === id ? { ...msg, ...partial } : msg
      );
      return { session: { ...s.session, messages: next } };
    }),

  // đặt yêu cầu nhảy đến trang
  setPendingJump: (jump) => set({ pendingJump: jump }),

  // reset lại state
  reset: () => set({ paper: undefined, session: undefined, pendingJump: null }),
}));
