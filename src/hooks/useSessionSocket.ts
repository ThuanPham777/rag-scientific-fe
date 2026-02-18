// src/hooks/useSessionSocket.ts
// Custom hook to manage WebSocket connection for a collaborative session.
// Wires up socket events → Zustand store + React Query cache.
//
// Design:
//   Server state (messages, reactions, highlights) → React Query cache (setQueryData)
//   UI-only state (typing, online members)        → Zustand store
//   We avoid invalidateQueries for high-frequency events to prevent
//   refetch storms and ensure instant UI updates.

import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getSocket,
  joinSessionRoom,
  leaveSessionRoom,
  emitTypingStart,
  emitTypingStop,
} from '../services/socket';
import { useSessionStore } from '../store/useSessionStore';
import { useAuthStore } from '../store/useAuthStore';
import { sessionKeys } from './queries/useSessionQueries';
import { highlightKeys } from './queries/useHighlightQueries';
import { chatKeys } from './queries/useChatQueries';
import {
  updateMessageReactionsInCache,
  markMessageDeletedInCache,
} from './queries/useChatQueries';
import type { ReactionAggregate } from '../utils/types';

// Typing auto-clear timeout (ms). If we don't receive a stop event
// within this window, we force-clear the typing state for that user.
const TYPING_TIMEOUT_MS = 8000;

/**
 * Connect to a collaborative session's WebSocket room.
 * Handles: join/leave room, listen for events, cleanup on unmount.
 *
 * @param conversationId - The conversation (session) ID to join
 * @param isCollaborative - Whether the conversation is collaborative
 * @param paperId - The paper ID (for highlight query invalidation)
 */
export function useSessionSocket(
  conversationId: string | undefined,
  isCollaborative: boolean,
  paperId?: string,
) {
  const queryClient = useQueryClient();

  // Use refs for values accessed inside socket callbacks to avoid stale closures.
  // The effect only re-runs when conversationId or paperId change, but these
  // refs always point to the latest values.
  const conversationIdRef = useRef(conversationId);
  conversationIdRef.current = conversationId;
  const paperIdRef = useRef(paperId);
  paperIdRef.current = paperId;

  const joinedRef = useRef<string | null>(null);
  // Track typing timeouts per userId so we can auto-clear.
  const typingTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  console.log(
    '[useSessionSocket] Hook rendered | conversationId:',
    conversationId,
    '| isCollaborative:',
    isCollaborative,
    '| paperId:',
    paperId,
  );

  // Join room on mount / when conversationId changes
  useEffect(() => {
    console.log(
      '[useSessionSocket] Effect triggered | conversationId:',
      conversationId,
      '| paperId:',
      paperId,
    );

    if (!conversationId) {
      console.log(
        '[useSessionSocket] No conversationId — skipping socket setup',
      );
      return;
    }

    // Access Zustand actions via useSessionStore.getState() inside callbacks
    // to avoid stale closures. Only destructure what's needed at setup time:
    const { setOnlineMembers } = useSessionStore.getState();

    const socket = getSocket();
    console.log(
      '[useSessionSocket] Socket state — connected:',
      socket.connected,
      '| id:',
      socket.id,
    );

    // Helper function to join the session room
    const joinRoom = () => {
      joinSessionRoom(conversationId)
        .then(({ onlineMembers }) => {
          console.log(
            '[useSessionSocket] ✅ Joined room for',
            conversationId,
            '| onlineMembers:',
            JSON.stringify(onlineMembers),
          );
          setOnlineMembers(onlineMembers);
          joinedRef.current = conversationId;
        })
        .catch((err) => {
          console.error('[useSessionSocket] ❌ Failed to join room:', err);
        });
    };

    // Join the session room on mount
    joinRoom();

    // Handle socket reconnection - rejoin room automatically
    const onReconnect = () => {
      console.log(
        '[useSessionSocket] 🔄 Socket reconnected, rejoining room:',
        conversationId,
      );
      joinRoom();
    };
    socket.on('reconnect', onReconnect);

    // ---------------------------------------------------------------
    // Helper: clear all typing timers
    // ---------------------------------------------------------------
    const clearAllTypingTimers = () => {
      typingTimers.current.forEach((t) => clearTimeout(t));
      typingTimers.current.clear();
    };

    // ---------------------------------------------------------------
    // Helper: start a typing auto-clear timer for a user
    // ---------------------------------------------------------------
    const startTypingTimer = (userId: string) => {
      // Clear existing timer for this user
      const existing = typingTimers.current.get(userId);
      if (existing) clearTimeout(existing);
      // Auto-clear after timeout
      const timer = setTimeout(() => {
        console.log('[useSessionSocket] ⏰ Typing timeout for userId:', userId);
        useSessionStore
          .getState()
          .setTyping({ userId, displayName: '', isTyping: false });
        typingTimers.current.delete(userId);
      }, TYPING_TIMEOUT_MS);
      typingTimers.current.set(userId, timer);
    };

    // ---------------------------------------------------------------
    // Event: user-joined
    // ---------------------------------------------------------------
    const onUserJoined = (data: {
      userId: string;
      displayName: string;
      avatarUrl: string | null;
    }) => {
      console.log(
        '[useSessionSocket] 📨 session:user-joined',
        JSON.stringify(data),
      );
      useSessionStore.getState().addOnlineMember({
        userId: data.userId,
        displayName: data.displayName,
        avatarUrl: data.avatarUrl,
      });
      // System message (join) is now created and broadcast by the backend.
      // Also refresh the full member list (includes role, etc.)
      queryClient.invalidateQueries({
        queryKey: sessionKeys.detail(conversationIdRef.current!),
      });
    };

    // ---------------------------------------------------------------
    // Event: user-left
    // ---------------------------------------------------------------
    const onUserLeft = (data: { userId: string; displayName?: string }) => {
      console.log(
        '[useSessionSocket] 📨 session:user-left',
        JSON.stringify(data),
      );
      // 1. Remove from online members (Zustand — instant UI)
      useSessionStore.getState().removeOnlineMember(data.userId);
      // 2. Clear typing state for the leaving user
      useSessionStore
        .getState()
        .setTyping({ userId: data.userId, displayName: '', isTyping: false });
      // Clear typing timer
      const timer = typingTimers.current.get(data.userId);
      if (timer) {
        clearTimeout(timer);
        typingTimers.current.delete(data.userId);
      }
      // System message (leave) is now created and broadcast by the backend.
      // Invalidate session detail so member list refreshes
      queryClient.invalidateQueries({
        queryKey: sessionKeys.detail(conversationIdRef.current!),
      });
    };

    // ---------------------------------------------------------------
    // Event: typing
    // ---------------------------------------------------------------
    const onTyping = (data: {
      userId: string;
      displayName: string;
      avatarUrl?: string | null;
      isTyping: boolean;
    }) => {
      console.log('[useSessionSocket] 📨 session:typing', JSON.stringify(data));
      useSessionStore.getState().setTyping(data);
      if (data.isTyping) {
        // Auto-clear after timeout in case stop event is lost
        startTypingTimer(data.userId);
      } else {
        // Explicit stop — clear timer
        const timer = typingTimers.current.get(data.userId);
        if (timer) {
          clearTimeout(timer);
          typingTimers.current.delete(data.userId);
        }
      }
    };

    // ---------------------------------------------------------------
    // Event: new-message  — append directly to the React Query cache.
    // This gives instant UI update instead of relying on refetch.
    // ---------------------------------------------------------------
    const onNewMessage = (msgData: any) => {
      console.log(
        '[useSessionSocket] 📨 session:new-message | msgId:',
        msgData?.id,
        '| role:',
        msgData?.role,
        '| content preview:',
        msgData?.content?.substring(0, 60),
      );
      const cId = conversationIdRef.current;
      if (!cId) return;

      // --- Normalise the payload so it matches the format that
      //     getMessageHistory() produces (lowercase role, string dates, etc.)
      //     The backend broadcasts  role: 'USER' | 'ASSISTANT' | 'SYSTEM'
      //     but the FE types expect 'user' | 'assistant' | 'system'.
      const normalised = {
        ...msgData,
        role:
          typeof msgData.role === 'string'
            ? msgData.role.toLowerCase()
            : msgData.role,
        createdAt:
          typeof msgData.createdAt === 'string'
            ? msgData.createdAt
            : new Date(msgData.createdAt).toISOString(),
        // Map imageUrl (S3 URL from BE) → imageDataUrl so ChatMessage renders it
        imageDataUrl: msgData.imageDataUrl || msgData.imageUrl || undefined,
      };

      // Clear typing for the sender (they just sent a message)
      if (normalised.userId) {
        useSessionStore.getState().setTyping({
          userId: normalised.userId,
          displayName: normalised.displayName || '',
          isTyping: false,
        });
      }

      // Skip cache insert for the SENDER's own messages.
      // The sender already has these in `sentMessages` (optimistic insert with
      // temp UUID). Inserting again from socket (with server ID) causes a brief
      // double-render because the IDs don't match during the race window.
      // The `finally` block in onSend/handleExplainRegion invalidates the cache
      // which will reconcile sentMessages with server data.
      const currentUserId = useAuthStore.getState().user?.id;
      if (normalised.userId && normalised.userId === currentUserId) {
        console.log(
          '[useSessionSocket] Skipping cache insert for own message:',
          normalised.id,
        );
        return;
      }

      // Directly update the infinite query cache by appending to the first page
      queryClient.setQueryData<any>(
        chatKeys.infiniteMessages(cId),
        (old: any) => {
          if (!old?.pages?.length) {
            console.log(
              '[useSessionSocket] Cache empty — will refetch instead of inserting',
            );
            return old;
          }

          // Check for duplicate (message might already exist from optimistic insert)
          for (const page of old.pages) {
            if (
              page.items?.some((m: { id: string }) => m.id === normalised.id)
            ) {
              console.log(
                '[useSessionSocket] Duplicate message, skipping cache insert',
              );
              return old; // Already in cache, no change
            }
          }

          console.log(
            '[useSessionSocket] Inserting message into cache, existing items:',
            old.pages[0]?.items?.length,
          );

          // Insert into the first page (newest messages page) at the beginning
          // Pages are DESC-ordered: page[0] = newest page, items within page are DESC
          const firstPage = old.pages[0];
          return {
            ...old,
            pages: [
              {
                ...firstPage,
                items: [normalised, ...firstPage.items],
              },
              ...old.pages.slice(1),
            ],
          };
        },
      );

      // If the cache was empty (setQueryData was a no-op), do a real refetch.
      // Otherwise just mark stale for eventual consistency.
      const currentCache = queryClient.getQueryData<any>(
        chatKeys.infiniteMessages(cId),
      );
      if (!currentCache?.pages?.length) {
        console.log(
          '[useSessionSocket] No cache after insert — triggering full refetch',
        );
        queryClient.invalidateQueries({
          queryKey: chatKeys.infiniteMessages(cId),
        });
      } else {
        queryClient.invalidateQueries({
          queryKey: chatKeys.infiniteMessages(cId),
          refetchType: 'none', // Don't refetch immediately, just mark stale
        });
      }
    };

    // ---------------------------------------------------------------
    // Highlight events
    // ---------------------------------------------------------------
    const onHighlightAdded = (data: any) => {
      console.log(
        '[useSessionSocket] 📨 session:highlight-added',
        JSON.stringify(data),
      );
      const pid = paperIdRef.current;
      if (pid) {
        queryClient.invalidateQueries({
          queryKey: highlightKeys.byPaper(pid),
        });
      }
    };

    const onHighlightUpdated = (data: any) => {
      console.log(
        '[useSessionSocket] 📨 session:highlight-updated',
        JSON.stringify(data),
      );
      const pid = paperIdRef.current;
      if (pid) {
        queryClient.invalidateQueries({
          queryKey: highlightKeys.byPaper(pid),
        });
      }
    };

    const onHighlightDeleted = (data: any) => {
      console.log(
        '[useSessionSocket] 📨 session:highlight-deleted',
        JSON.stringify(data),
      );
      const pid = paperIdRef.current;
      if (pid) {
        queryClient.invalidateQueries({
          queryKey: highlightKeys.byPaper(pid),
        });
      }
    };

    // ---------------------------------------------------------------
    // Comment events
    // ---------------------------------------------------------------
    const onCommentAdded = (data: { highlightId?: string }) => {
      console.log(
        '[useSessionSocket] 📨 session:comment-added',
        JSON.stringify(data),
      );
      const pid = paperIdRef.current;
      if (pid) {
        queryClient.invalidateQueries({
          queryKey: highlightKeys.byPaper(pid),
        });
      }
      if (data?.highlightId) {
        queryClient.invalidateQueries({
          queryKey: highlightKeys.byHighlight(data.highlightId),
        });
        queryClient.invalidateQueries({
          queryKey: highlightKeys.comments(data.highlightId),
        });
      }
    };

    const onCommentUpdated = (data: { highlightId?: string }) => {
      console.log(
        '[useSessionSocket] 📨 session:comment-updated',
        JSON.stringify(data),
      );
      const pid = paperIdRef.current;
      if (pid) {
        queryClient.invalidateQueries({
          queryKey: highlightKeys.byPaper(pid),
        });
      }
      if (data?.highlightId) {
        queryClient.invalidateQueries({
          queryKey: highlightKeys.byHighlight(data.highlightId),
        });
        queryClient.invalidateQueries({
          queryKey: highlightKeys.comments(data.highlightId),
        });
      }
    };

    const onCommentDeleted = (data: { highlightId?: string }) => {
      console.log(
        '[useSessionSocket] 📨 session:comment-deleted',
        JSON.stringify(data),
      );
      const pid = paperIdRef.current;
      if (pid) {
        queryClient.invalidateQueries({
          queryKey: highlightKeys.byPaper(pid),
        });
      }
      if (data?.highlightId) {
        queryClient.invalidateQueries({
          queryKey: highlightKeys.byHighlight(data.highlightId),
        });
        queryClient.invalidateQueries({
          queryKey: highlightKeys.comments(data.highlightId),
        });
      }
    };

    // ---------------------------------------------------------------
    // Event: reaction-update — directly update cache (no refetch)
    // ---------------------------------------------------------------
    const onReactionUpdate = (data: {
      messageId: string;
      reactions: ReactionAggregate[];
    }) => {
      console.log(
        '[useSessionSocket] 📨 session:reaction-update',
        JSON.stringify(data),
      );
      const cId = conversationIdRef.current;
      if (cId) {
        // The server computes hasReacted from the perspective of the user who
        // just toggled the reaction, NOT the recipient. Re-derive it here
        // using the current user's ID and the reactedBy array.
        const myId = useAuthStore.getState().user?.id;
        const fixed = data.reactions.map((r) => ({
          ...r,
          hasReacted: myId
            ? (r.reactedBy ?? []).some((u) => u.userId === myId)
            : false,
        }));
        updateMessageReactionsInCache(queryClient, cId, data.messageId, fixed);
      }
    };

    // ---------------------------------------------------------------
    // Event: message-deleted — directly update cache (no refetch)
    // ---------------------------------------------------------------
    const onMessageDeleted = (data: { messageId: string }) => {
      console.log(
        '[useSessionSocket] 📨 session:message-deleted',
        JSON.stringify(data),
      );
      const cId = conversationIdRef.current;
      if (cId) {
        markMessageDeletedInCache(queryClient, cId, data.messageId);
      }
    };

    // ---------------------------------------------------------------
    // Event: member-removed
    // ---------------------------------------------------------------
    const onMemberRemoved = (data: { userId: string }) => {
      console.log(
        '[useSessionSocket] 📨 session:member-removed',
        JSON.stringify(data),
      );
      useSessionStore.getState().removeOnlineMember(data.userId);
      // System message (removal) comes via session:new-message from the backend.
      queryClient.invalidateQueries({
        queryKey: sessionKeys.detail(conversationIdRef.current!),
      });
    };

    // ---------------------------------------------------------------
    // Event: session ended
    // ---------------------------------------------------------------
    const onSessionEnded = (data: any) => {
      console.log('[useSessionSocket] 📨 session:ended', JSON.stringify(data));
      // System message (end) comes via session:new-message from the backend.
      useSessionStore.getState().resetSession();
      queryClient.invalidateQueries({
        queryKey: sessionKeys.detail(conversationIdRef.current!),
      });
    };

    // ---------------------------------------------------------------
    // Register all listeners
    // ---------------------------------------------------------------
    console.log(
      '[useSessionSocket] Registering event listeners for conversation:',
      conversationId,
    );

    socket.on('session:user-joined', onUserJoined);
    socket.on('session:user-left', onUserLeft);
    socket.on('session:typing', onTyping);
    socket.on('session:new-message', onNewMessage);
    socket.on('session:highlight-added', onHighlightAdded);
    socket.on('session:highlight-updated', onHighlightUpdated);
    socket.on('session:highlight-deleted', onHighlightDeleted);
    socket.on('session:comment-added', onCommentAdded);
    socket.on('session:comment-updated', onCommentUpdated);
    socket.on('session:comment-deleted', onCommentDeleted);
    socket.on('session:reaction-update', onReactionUpdate);
    socket.on('session:message-deleted', onMessageDeleted);
    socket.on('session:member-removed', onMemberRemoved);
    socket.on('session:ended', onSessionEnded);

    // ---------------------------------------------------------------
    // Cleanup
    // ---------------------------------------------------------------
    return () => {
      console.log(
        '[useSessionSocket] Cleanup — removing listeners and leaving room. joinedRef:',
        joinedRef.current,
      );

      socket.off('reconnect', onReconnect);
      socket.off('session:user-joined', onUserJoined);
      socket.off('session:user-left', onUserLeft);
      socket.off('session:typing', onTyping);
      socket.off('session:new-message', onNewMessage);
      socket.off('session:highlight-added', onHighlightAdded);
      socket.off('session:highlight-updated', onHighlightUpdated);
      socket.off('session:highlight-deleted', onHighlightDeleted);
      socket.off('session:comment-added', onCommentAdded);
      socket.off('session:comment-updated', onCommentUpdated);
      socket.off('session:comment-deleted', onCommentDeleted);
      socket.off('session:reaction-update', onReactionUpdate);
      socket.off('session:message-deleted', onMessageDeleted);
      socket.off('session:member-removed', onMemberRemoved);
      socket.off('session:ended', onSessionEnded);

      // Clear all typing timers
      clearAllTypingTimers();

      if (joinedRef.current) {
        console.log('[useSessionSocket] Leaving room:', joinedRef.current);
        leaveSessionRoom(joinedRef.current);
        joinedRef.current = null;
      }
      // Only clear socket-related state (online members, typing).
      // Do NOT reset isCollaborative — that's derived from conversation data,
      // not from the socket lifecycle.
      useSessionStore.getState().setOnlineMembers([]);
      useSessionStore.getState().setTyping({
        userId: '',
        displayName: '',
        isTyping: false,
      });
    };
    // queryClient is stable and doesn't need to be in deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, paperId]);

  // Typing helpers
  const startTyping = useCallback(() => {
    if (conversationId && isCollaborative) {
      console.log('[useSessionSocket] startTyping for', conversationId);
      emitTypingStart(conversationId);
    }
  }, [conversationId, isCollaborative]);

  const stopTyping = useCallback(() => {
    if (conversationId && isCollaborative) {
      console.log('[useSessionSocket] stopTyping for', conversationId);
      emitTypingStop(conversationId);
    }
  }, [conversationId, isCollaborative]);

  return { startTyping, stopTyping };
}
