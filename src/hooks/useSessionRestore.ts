// src/hooks/useSessionRestore.ts
// Custom hook for restoring chat sessions from URL

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePaperStore } from '../store/usePaperStore';
import { useGuestStore, isGuestSession } from '../store/useGuestStore';
import { useAuthStore } from '../store/useAuthStore';
import { getConversation, getPaper, getMessageHistory } from '../services';

interface UseSessionRestoreOptions {
  urlConversationId?: string;
}

interface UseSessionRestoreReturn {
  isLoading: boolean;
  isGuest: boolean;
}

/**
 * Hook to restore session from URL on page load/refresh
 */
export function useSessionRestore({
  urlConversationId,
}: UseSessionRestoreOptions): UseSessionRestoreReturn {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { session, setSession, setPaper, setMessages } = usePaperStore();

  // Check if session needs restoration
  const [isLoading, setIsLoading] = useState(() => {
    if (!urlConversationId) return false;

    // Check if guest session exists in localStorage
    const guestStore = useGuestStore.getState();
    if (guestStore.currentSession?.id === urlConversationId) {
      return false;
    }

    // Authenticated session - check paper store
    if (usePaperStore.getState().session?.id === urlConversationId) {
      return false;
    }

    return true;
  });

  // Determine if guest
  const isGuest = urlConversationId
    ? !isAuthenticated && isGuestSession(urlConversationId)
    : !isAuthenticated;

  // Restore guest session
  const restoreGuestSession = useCallback(() => {
    const guestStore = useGuestStore.getState();
    if (
      urlConversationId &&
      guestStore.currentSession?.id === urlConversationId &&
      guestStore.currentPaper
    ) {
      // Sync to paper store for PDF viewer
      setPaper({
        id: guestStore.currentPaper.id,
        ragFileId: guestStore.currentPaper.ragFileId,
        fileName: guestStore.currentPaper.fileName,
        fileUrl: guestStore.currentPaper.fileUrl,
        localUrl: guestStore.currentPaper.fileUrl,
        status: guestStore.currentPaper.status || 'COMPLETED',
        createdAt: guestStore.currentPaper.createdAt,
        updatedAt: guestStore.currentPaper.createdAt,
        userId: '',
      } as any);

      setSession({
        id: guestStore.currentSession.id,
        paperId: guestStore.currentSession.paperId,
        ragFileId: guestStore.currentSession.ragFileId,
        messages: guestStore.currentSession.messages,
      });

      return true;
    }
    return false;
  }, [urlConversationId, setPaper, setSession]);

  // Restore authenticated session from API
  const restoreAuthSession = useCallback(async () => {
    if (!urlConversationId) return;

    try {
      // Get conversation details
      const response = await getConversation(urlConversationId);
      const conv = response.data;

      if (conv && conv.id) {
        // Set session
        setSession({
          id: conv.id,
          paperId: conv.paperId,
          ragFileId: conv.ragFileId,
          title: conv.title,
          messages: [],
        });

        // Load paper if we have paperId
        if (conv.paperId) {
          try {
            const paperResponse = await getPaper(conv.paperId);
            if (paperResponse.data) {
              setPaper(paperResponse.data);
            }
          } catch (err) {
            console.error('Failed to load paper:', err);
          }
        }

        // Load message history
        try {
          const messages = await getMessageHistory(
            urlConversationId,
            conv.paperId,
          );
          if (messages.length > 0) {
            setMessages(messages);
          }
        } catch (err) {
          console.error('Failed to load message history:', err);
        }
      } else {
        console.error('Invalid conversation response:', response);
        navigate('/', { replace: true });
      }
    } catch (err) {
      console.error('Failed to restore session:', err);
      navigate('/', { replace: true });
    }
  }, [urlConversationId, setSession, setPaper, setMessages, navigate]);

  // Restore session on mount
  useEffect(() => {
    const restoreSession = async () => {
      // Try guest session first
      if (restoreGuestSession()) {
        setIsLoading(false);
        return;
      }

      // For authenticated users, restore from API
      if (urlConversationId && isAuthenticated && !session) {
        setIsLoading(true);
        await restoreAuthSession();
        setIsLoading(false);
        return;
      }

      // Guest without session
      const guestStore = useGuestStore.getState();
      if (urlConversationId && !isAuthenticated && !guestStore.currentSession) {
        navigate('/', { replace: true });
      }

      setIsLoading(false);
    };

    restoreSession();
  }, [
    urlConversationId,
    isAuthenticated,
    session,
    restoreGuestSession,
    restoreAuthSession,
    navigate,
  ]);

  // Update URL when session changes
  useEffect(() => {
    const guestStore = useGuestStore.getState();

    // For authenticated sessions
    if (session?.id && !urlConversationId && !isGuest) {
      navigate(`/chat/${session.id}`, { replace: true });
    }
    // For guest sessions
    if (guestStore.currentSession?.id && !urlConversationId && isGuest) {
      navigate(`/chat/${guestStore.currentSession.id}`, { replace: true });
    }
  }, [session?.id, urlConversationId, navigate, isGuest]);

  return {
    isLoading,
    isGuest,
  };
}
