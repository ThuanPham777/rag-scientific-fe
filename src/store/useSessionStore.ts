// src/store/useSessionStore.ts
// Zustand store for collaborative session UI state only.
// Server data (session detail, members) lives in React Query.

import { create } from 'zustand';
import type { OnlineMember, TypingIndicator } from '../utils/types';

interface SessionState {
  // Whether the current conversation is a collaborative session
  isCollaborative: boolean;
  setCollaborative: (value: boolean) => void;

  // Online members (from WebSocket)
  onlineMembers: OnlineMember[];
  setOnlineMembers: (members: OnlineMember[]) => void;
  addOnlineMember: (member: OnlineMember) => void;
  removeOnlineMember: (userId: string) => void;

  // Typing indicators
  typingUsers: TypingIndicator[];
  setTyping: (indicator: TypingIndicator) => void;
  clearTyping: (userId: string) => void;

  // Assistant thinking state (broadcast via socket when @Assistant is invoked)
  assistantThinking: boolean;
  setAssistantThinking: (value: boolean) => void;

  // Invite modal visibility
  isInviteModalOpen: boolean;
  setInviteModalOpen: (open: boolean) => void;

  // Members panel visibility
  isMembersPanelOpen: boolean;
  setMembersPanelOpen: (open: boolean) => void;

  // Reset session state (on leave/end/navigate away)
  resetSession: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  isCollaborative: false,
  setCollaborative: (value) => set({ isCollaborative: value }),

  onlineMembers: [],
  setOnlineMembers: (members) => set({ onlineMembers: members }),
  addOnlineMember: (member) =>
    set((s) => {
      if (s.onlineMembers.some((m) => m.userId === member.userId)) return s;
      return { onlineMembers: [...s.onlineMembers, member] };
    }),
  removeOnlineMember: (userId) =>
    set((s) => ({
      onlineMembers: s.onlineMembers.filter((m) => m.userId !== userId),
    })),

  typingUsers: [],
  setTyping: (indicator) =>
    set((s) => {
      if (indicator.isTyping) {
        const exists = s.typingUsers.some((t) => t.userId === indicator.userId);
        if (exists) return s;
        return { typingUsers: [...s.typingUsers, indicator] };
      }
      return {
        typingUsers: s.typingUsers.filter((t) => t.userId !== indicator.userId),
      };
    }),
  clearTyping: (userId) =>
    set((s) => ({
      typingUsers: s.typingUsers.filter((t) => t.userId !== userId),
    })),

  assistantThinking: false,
  setAssistantThinking: (value) => set({ assistantThinking: value }),

  isInviteModalOpen: false,
  setInviteModalOpen: (open) => set({ isInviteModalOpen: open }),

  isMembersPanelOpen: false,
  setMembersPanelOpen: (open) => set({ isMembersPanelOpen: open }),

  resetSession: () =>
    set({
      isCollaborative: false,
      onlineMembers: [],
      typingUsers: [],
      assistantThinking: false,
      isInviteModalOpen: false,
      isMembersPanelOpen: false,
    }),
}));
