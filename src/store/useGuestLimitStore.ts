// src/store/useGuestLimitStore.ts
// Usage limits for unauthenticated (guest) users.
// Guests are allowed 1 PDF upload and 1 AI request per session.
// Limits persist across page reloads but reset on login/logout.

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useAuthStore } from './useAuthStore';

const GUEST_AI_LIMIT = 1;
const GUEST_UPLOAD_LIMIT = 1;

interface GuestLimitState {
  aiRequestsUsed: number;
  uploadsUsed: number;

  /** Check whether the guest can still make an AI request. */
  canMakeAiRequest: () => boolean;
  /** Check whether the guest can still upload a PDF. */
  canUpload: () => boolean;

  /**
   * Atomically check the AI limit and, if allowed, increment the counter.
   * @returns `true` if the request is permitted (counter was incremented),
   *          `false` if the limit has been reached.
   */
  tryUseAiRequest: () => boolean;

  /**
   * Atomically check the upload limit and, if allowed, increment the counter.
   * @returns `true` if the upload is permitted (counter was incremented),
   *          `false` if the limit has been reached.
   */
  tryUseUpload: () => boolean;

  /** Reset both counters (called on logout). */
  resetLimits: () => void;
}

export const useGuestLimitStore = create<GuestLimitState>()(
  persist(
    (set, get) => ({
      aiRequestsUsed: 0,
      uploadsUsed: 0,

      canMakeAiRequest: () => get().aiRequestsUsed < GUEST_AI_LIMIT,
      canUpload: () => get().uploadsUsed < GUEST_UPLOAD_LIMIT,

      tryUseAiRequest: () => {
        const { aiRequestsUsed } = get();
        if (aiRequestsUsed >= GUEST_AI_LIMIT) return false;
        set({ aiRequestsUsed: aiRequestsUsed + 1 });
        return true;
      },

      tryUseUpload: () => {
        const { uploadsUsed } = get();
        if (uploadsUsed >= GUEST_UPLOAD_LIMIT) return false;
        set({ uploadsUsed: uploadsUsed + 1 });
        return true;
      },

      resetLimits: () => set({ aiRequestsUsed: 0, uploadsUsed: 0 }),
    }),
    {
      name: 'guest-limit-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        aiRequestsUsed: state.aiRequestsUsed,
        uploadsUsed: state.uploadsUsed,
      }),
    },
  ),
);

// ---------------------------------------------------------------------------
// Auto-reset: any auth transition resets guest limits.
//   • login  (false → true):  limits no longer relevant, clear them so
//     a future logout starts a fresh guest session.
//   • logout (true → false):  new guest session begins with full quota.
// ---------------------------------------------------------------------------
let prevAuthenticated = useAuthStore.getState().isAuthenticated;

useAuthStore.subscribe((state) => {
  if (prevAuthenticated !== state.isAuthenticated) {
    useGuestLimitStore.getState().resetLimits();
  }
  prevAuthenticated = state.isAuthenticated;
});
