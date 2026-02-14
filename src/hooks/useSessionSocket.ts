// src/hooks/useSessionSocket.ts
// Custom hook to manage WebSocket connection for a collaborative session.
// Wires up socket events → Zustand store + React Query cache.

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
import { sessionKeys } from './queries/useSessionQueries';
import { highlightKeys } from './queries/useHighlightQueries';
import { chatKeys } from './queries/useChatQueries';

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
  const {
    setOnlineMembers,
    addOnlineMember,
    removeOnlineMember,
    setTyping,
    resetSession,
  } = useSessionStore();

  const joinedRef = useRef<string | null>(null);

  // Join room on mount / when conversationId changes
  // conversationId is only passed when isCollaborative is true (see ChatPage),
  // so we only need to guard on conversationId here.
  useEffect(() => {
    if (!conversationId) return;

    const socket = getSocket();

    // Join the session room
    joinSessionRoom(conversationId).then(({ onlineMembers }) => {
      setOnlineMembers(onlineMembers.map((m) => ({ ...m, avatarUrl: null })));
      joinedRef.current = conversationId;
    });

    // --- Event listeners ---

    const onUserJoined = (data: {
      userId: string;
      displayName: string;
      avatarUrl: string | null;
    }) => {
      addOnlineMember({
        userId: data.userId,
        displayName: data.displayName,
        avatarUrl: data.avatarUrl,
      });
      // Refresh member list from server
      queryClient.invalidateQueries({
        queryKey: sessionKeys.detail(conversationId),
      });
    };

    const onUserLeft = (data: { userId: string }) => {
      removeOnlineMember(data.userId);
      setTyping({ userId: data.userId, displayName: '', isTyping: false });
    };

    const onTyping = (data: {
      userId: string;
      displayName: string;
      isTyping: boolean;
    }) => {
      setTyping(data);
    };

    const onNewMessage = (_data: any) => {
      // Invalidate infinite message query so new messages appear
      queryClient.invalidateQueries({
        queryKey: chatKeys.infiniteMessages(conversationId),
      });
    };

    const onHighlightAdded = () => {
      if (paperId) {
        queryClient.invalidateQueries({
          queryKey: highlightKeys.byPaper(paperId),
        });
      }
    };

    const onHighlightUpdated = () => {
      if (paperId) {
        queryClient.invalidateQueries({
          queryKey: highlightKeys.byPaper(paperId),
        });
      }
    };

    const onHighlightDeleted = () => {
      if (paperId) {
        queryClient.invalidateQueries({
          queryKey: highlightKeys.byPaper(paperId),
        });
      }
    };

    const onCommentAdded = () => {
      if (paperId) {
        queryClient.invalidateQueries({
          queryKey: highlightKeys.byPaper(paperId),
        });
      }
    };

    const onMemberRemoved = (data: { userId: string }) => {
      removeOnlineMember(data.userId);
      queryClient.invalidateQueries({
        queryKey: sessionKeys.detail(conversationId),
      });
    };

    const onSessionEnded = () => {
      resetSession();
      queryClient.invalidateQueries({
        queryKey: sessionKeys.detail(conversationId),
      });
    };

    socket.on('session:user-joined', onUserJoined);
    socket.on('session:user-left', onUserLeft);
    socket.on('session:typing', onTyping);
    socket.on('session:new-message', onNewMessage);
    socket.on('session:highlight-added', onHighlightAdded);
    socket.on('session:highlight-updated', onHighlightUpdated);
    socket.on('session:highlight-deleted', onHighlightDeleted);
    socket.on('session:comment-added', onCommentAdded);
    socket.on('session:member-removed', onMemberRemoved);
    socket.on('session:ended', onSessionEnded);

    // Cleanup
    return () => {
      socket.off('session:user-joined', onUserJoined);
      socket.off('session:user-left', onUserLeft);
      socket.off('session:typing', onTyping);
      socket.off('session:new-message', onNewMessage);
      socket.off('session:highlight-added', onHighlightAdded);
      socket.off('session:highlight-updated', onHighlightUpdated);
      socket.off('session:highlight-deleted', onHighlightDeleted);
      socket.off('session:comment-added', onCommentAdded);
      socket.off('session:member-removed', onMemberRemoved);
      socket.off('session:ended', onSessionEnded);

      if (joinedRef.current) {
        leaveSessionRoom(joinedRef.current);
        joinedRef.current = null;
      }
      // Only clear socket-related state (online members, typing).
      // Do NOT reset isCollaborative — that's derived from conversation data,
      // not from the socket lifecycle.
      setOnlineMembers([]);
    };
  }, [conversationId, paperId]);

  // Typing helpers
  const startTyping = useCallback(() => {
    if (conversationId && isCollaborative) emitTypingStart(conversationId);
  }, [conversationId, isCollaborative]);

  const stopTyping = useCallback(() => {
    if (conversationId && isCollaborative) emitTypingStop(conversationId);
  }, [conversationId, isCollaborative]);

  return { startTyping, stopTyping };
}
