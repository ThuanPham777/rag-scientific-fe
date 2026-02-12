// src/hooks/useMultiPaperChat.ts
// Custom hook for multi-paper chat logic
// ONE persistent conversation for all multi-paper chats
// Uses React Query cursor pagination (same pattern as single-paper ChatPage)

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMultiPaperChatStore } from '../../store/useMultiPaperChatStore';
import { askMultiPaper, listMultiPaperConversations } from '../../services';
import {
  useInfiniteMessageHistory,
  flattenMessagePages,
} from '../queries/useChatQueries';
import type { ChatMessage } from '../../utils/types';

export function useMultiPaperChat() {
  const selectedPapers = useMultiPaperChatStore((s) => s.selectedPapers);
  const currentConversationId = useMultiPaperChatStore(
    (s) => s.currentConversationId,
  );
  const isLoading = useMultiPaperChatStore((s) => s.isLoading);
  const setCurrentConversationId = useMultiPaperChatStore(
    (s) => s.setCurrentConversationId,
  );
  const setLoading = useMultiPaperChatStore((s) => s.setLoading);
  const reset = useMultiPaperChatStore((s) => s.reset);

  // Track if we've loaded the multi-paper conversation ID
  const [hasLoadedConversation, setHasLoadedConversation] = useState(false);

  // Track messages sent during this session (not yet in React Query cache)
  const [sentMessages, setSentMessages] = useState<ChatMessage[]>([]);

  /**
   * Load the user's multi-paper conversation ID from backend.
   * Only fetches the conversation ID — messages are loaded by useInfiniteMessageHistory.
   */
  const loadExistingConversation = useCallback(async () => {
    if (hasLoadedConversation) return;

    try {
      const response = await listMultiPaperConversations();
      if (response.success && response.data.length > 0) {
        setCurrentConversationId(response.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load multi-paper conversation:', err);
    } finally {
      setHasLoadedConversation(true);
    }
  }, [hasLoadedConversation, setCurrentConversationId]);

  // Load conversation ID on mount (only once)
  useEffect(() => {
    if (!hasLoadedConversation) {
      loadExistingConversation();
    }
  }, [hasLoadedConversation, loadExistingConversation]);

  // Cursor-paginated message history via React Query
  // Backend returns DESC (newest first), React Query handles paging
  const {
    data: infiniteData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteMessageHistory(
    currentConversationId ?? undefined,
    undefined, // no paperId for multi-paper
  );

  // Flatten paginated server messages into ASC order for display
  const serverMessages = useMemo(
    () => flattenMessagePages(infiniteData),
    [infiniteData],
  );

  // Combine server + sent messages, deduplicate by ID
  const messages = useMemo(() => {
    const serverIds = new Set(serverMessages.map((m) => m.id));
    const uniqueSent = sentMessages.filter((m) => !serverIds.has(m.id));
    return [...serverMessages, ...uniqueSent];
  }, [serverMessages, sentMessages]);

  // Reset sentMessages when conversation changes
  useEffect(() => {
    setSentMessages([]);
  }, [currentConversationId]);

  /**
   * Send a message to the multi-paper chat
   */
  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || selectedPapers.length === 0) return;

      // Optimistic user message
      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: text,
        createdAt: new Date().toISOString(),
      };
      setSentMessages((prev) => [...prev, userMsg]);

      try {
        setLoading(true);

        const paperIds = selectedPapers.map((p) => p.id);
        const { assistantMsg, conversationId: returnedConvId } =
          await askMultiPaper(
            paperIds,
            text,
            currentConversationId ?? undefined,
          );

        // Store the backend conversation ID for subsequent messages
        if (returnedConvId && !currentConversationId) {
          setCurrentConversationId(returnedConvId);
        }

        setSentMessages((prev) => [...prev, assistantMsg]);
      } catch (err) {
        console.error('Multi-paper chat error:', err);
        const errorMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content:
            '⚠️ Sorry, something went wrong while processing your question.',
          createdAt: new Date().toISOString(),
        };
        setSentMessages((prev) => [...prev, errorMsg]);
      } finally {
        setLoading(false);
      }
    },
    [
      selectedPapers,
      currentConversationId,
      setLoading,
      setCurrentConversationId,
    ],
  );

  /**
   * Clear the chat session
   */
  const clearChat = useCallback(() => {
    reset();
    setSentMessages([]);
    setHasLoadedConversation(false);
  }, [reset]);

  return {
    selectedPapers,
    currentConversationId,
    isLoading,
    messages,
    sendMessage,
    clearChat,
    hasSelectedPapers: selectedPapers.length > 0,
    loadExistingConversation,
    // Pagination controls for "load older messages"
    fetchNextPage,
    hasNextPage: hasNextPage ?? false,
    isFetchingNextPage,
  };
}
