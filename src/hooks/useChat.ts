// src/hooks/useChat.ts
// Custom hook for chat logic - handles both guest and authenticated sessions

import { useCallback } from 'react';
import { usePaperStore } from '../store/usePaperStore';
import { useGuestStore, isGuestSession } from '../store/useGuestStore';
import { useAuthStore } from '../store/useAuthStore';
import {
  sendQuery,
  guestAskQuestion,
  buildGuestAssistantMessage,
} from '../services';
import type { ChatMessage, Paper, ChatSession } from '../utils/types';
import type { GuestSession } from '../store/useGuestStore';

interface UseChatOptions {
  urlConversationId?: string;
}

interface UseChatReturn {
  // State
  isGuest: boolean;
  isLoading: boolean;
  messages: ChatMessage[];
  activeSession: ChatSession | GuestSession | null;
  activePaper: Paper | undefined;

  // Actions
  sendMessage: (text: string) => Promise<void>;
  handlePdfAction: (
    action: 'explain' | 'summarize',
    selectedText: string,
  ) => Promise<void>;
}

/**
 * Hook to manage chat functionality for both guest and authenticated users
 */
export function useChat({ urlConversationId }: UseChatOptions): UseChatReturn {
  const { isAuthenticated } = useAuthStore();

  // Authenticated user stores
  const { session, paper, isChatLoading, addMessage, setChatLoading } =
    usePaperStore();

  // Guest stores
  const {
    currentSession: guestSession,
    currentPaper: guestPaper,
    addGuestMessage,
    isLoading: guestIsLoading,
    setLoading: setGuestLoading,
  } = useGuestStore();

  // Determine if this is a guest session
  const isGuest = urlConversationId
    ? !isAuthenticated && isGuestSession(urlConversationId)
    : !isAuthenticated;

  // Get active session and paper
  const activeSession = isGuest ? guestSession : session;

  // Convert guest paper to Paper format
  const activePaper: Paper | undefined = isGuest
    ? guestPaper
      ? ({
          id: guestPaper.id,
          ragFileId: guestPaper.ragFileId,
          fileName: guestPaper.fileName,
          fileUrl: guestPaper.fileUrl,
          localUrl: guestPaper.fileUrl,
          status: (guestPaper.status || 'COMPLETED') as
            | 'PROCESSING'
            | 'COMPLETED'
            | 'FAILED',
          createdAt: guestPaper.createdAt,
          userId: '',
        } as Paper)
      : undefined
    : paper;

  // Get messages
  const messages = isGuest
    ? guestSession?.messages || []
    : session?.messages || [];

  // Loading state
  const isLoading = isGuest ? guestIsLoading : isChatLoading;

  /**
   * Create a user message object
   */
  const createUserMessage = useCallback((text: string): ChatMessage => {
    return {
      id: crypto.randomUUID(),
      role: 'user',
      content: text.trim(),
      createdAt: new Date().toISOString(),
    };
  }, []);

  /**
   * Create an error message object
   */
  const createErrorMessage = useCallback(
    (
      message = '⚠️ Sorry, something went wrong while processing your question.',
    ): ChatMessage => {
      return {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: message,
        createdAt: new Date().toISOString(),
      };
    },
    [],
  );

  /**
   * Send a chat message
   */
  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || !activeSession) return;

      const userMsg = createUserMessage(text);

      // Add user message to appropriate store
      if (isGuest) {
        addGuestMessage(userMsg);
      } else {
        addMessage(userMsg);
      }

      // Set loading state
      const setLoading = isGuest ? setGuestLoading : setChatLoading;

      try {
        setLoading(true);

        if (isGuest && guestSession) {
          // Guest: Call guest API
          const { answer, citations, raw } = await guestAskQuestion(
            guestSession.ragFileId,
            text,
            guestPaper?.id || '',
          );
          const assistantMsg = buildGuestAssistantMessage(
            answer,
            citations,
            raw.modelName,
            raw.tokenCount,
          );
          addGuestMessage(assistantMsg);
        } else if (session) {
          // Authenticated: Call regular API
          const { assistantMsg } = await sendQuery(session.id, text, paper?.id);
          addMessage(assistantMsg);
        }
      } catch (err: any) {
        console.error('❌ Chat error:', err);
        const errorMsg = createErrorMessage();
        if (isGuest) {
          addGuestMessage(errorMsg);
        } else {
          addMessage(errorMsg);
        }
      } finally {
        setLoading(false);
      }
    },
    [
      activeSession,
      isGuest,
      guestSession,
      guestPaper,
      session,
      paper,
      addGuestMessage,
      addMessage,
      setGuestLoading,
      setChatLoading,
      createUserMessage,
      createErrorMessage,
    ],
  );

  /**
   * Handle PDF actions (explain/summarize selected text)
   */
  const handlePdfAction = useCallback(
    async (action: 'explain' | 'summarize', selectedText: string) => {
      if (!activeSession || !selectedText.trim()) return;

      const queryText =
        action === 'explain'
          ? `Explain the following text: "${selectedText}"`
          : `Summarize the following text: "${selectedText}"`;

      const userMsg = createUserMessage(queryText);

      // Add user message to appropriate store
      if (isGuest) {
        addGuestMessage(userMsg);
      } else {
        addMessage(userMsg);
      }

      // Set loading state
      const setLoading = isGuest ? setGuestLoading : setChatLoading;

      try {
        setLoading(true);

        if (isGuest && guestSession) {
          // Guest: Call guest API
          const { answer, citations, raw } = await guestAskQuestion(
            guestSession.ragFileId,
            queryText,
            guestPaper?.id || '',
          );
          const assistantMsg = buildGuestAssistantMessage(
            answer,
            citations,
            raw.modelName,
            raw.tokenCount,
          );
          addGuestMessage(assistantMsg);
        } else if (session) {
          // Authenticated: Call regular API
          const { assistantMsg } = await sendQuery(
            session.id,
            queryText,
            paper?.id,
          );
          addMessage(assistantMsg);
        }
      } catch (err: any) {
        console.error('❌ PDF action error:', err);
        const errorMsg = createErrorMessage(
          '⚠️ Sorry, something went wrong while processing your request.',
        );
        if (isGuest) {
          addGuestMessage(errorMsg);
        } else {
          addMessage(errorMsg);
        }
      } finally {
        setLoading(false);
      }
    },
    [
      activeSession,
      isGuest,
      guestSession,
      guestPaper,
      session,
      paper,
      addGuestMessage,
      addMessage,
      setGuestLoading,
      setChatLoading,
      createUserMessage,
      createErrorMessage,
    ],
  );

  return {
    isGuest,
    isLoading,
    messages,
    activeSession: activeSession ?? null,
    activePaper,
    sendMessage,
    handlePdfAction,
  };
}
