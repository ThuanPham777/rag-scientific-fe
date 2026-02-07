// src/hooks/useMultiPaperChat.ts
// Custom hook for multi-paper chat logic
// ONE persistent conversation for all multi-paper chats

import { useCallback, useEffect, useState } from 'react';
import { useMultiPaperChatStore } from '../../store/useMultiPaperChatStore';
import {
  askMultiPaper,
  getMessageHistory,
  listMultiPaperConversations,
} from '../../services';
import type { ChatMessage } from '../../utils/types';

export function useMultiPaperChat() {
  // Use new API from useMultiPaperChatStore
  const selectedPapers = useMultiPaperChatStore((s) => s.selectedPapers);
  const currentConversationId = useMultiPaperChatStore(
    (s) => s.currentConversationId,
  );
  const optimisticMessages = useMultiPaperChatStore(
    (s) => s.optimisticMessages,
  );
  const isLoading = useMultiPaperChatStore((s) => s.isLoading);
  const addOptimisticMessage = useMultiPaperChatStore(
    (s) => s.addOptimisticMessage,
  );
  const setOptimisticMessages = useMultiPaperChatStore(
    (s) => s.setOptimisticMessages,
  );
  const setCurrentConversationId = useMultiPaperChatStore(
    (s) => s.setCurrentConversationId,
  );
  const setLoading = useMultiPaperChatStore((s) => s.setLoading);
  const reset = useMultiPaperChatStore((s) => s.reset);

  // Track if we've loaded the multi-paper conversation
  const [hasLoadedConversation, setHasLoadedConversation] = useState(false);

  /**
   * Load the user's multi-paper conversation from backend
   * There is ONE conversation for all multi-paper chats - papers are just context
   */
  const loadExistingConversation = useCallback(async () => {
    if (hasLoadedConversation) return;

    try {
      // Get the user's multi-paper conversations (sorted by most recent)
      const response = await listMultiPaperConversations();
      if (!response.success || !response.data.length) {
        setHasLoadedConversation(true);
        return;
      }

      // Use the most recent multi-paper conversation (there should be only one)
      const conv = response.data[0];

      // Load ALL messages from this conversation
      const messages = await getMessageHistory(conv.id);

      // Map messages to ChatMessage format (getMessageHistory already returns ChatMessage[])
      const chatMessages: ChatMessage[] = messages.map((m) => ({
        ...m,
        // Re-parse citations if they exist (might have different paper context)
        citations: m.citations ? m.citations : undefined,
      }));

      // Set conversation ID and messages
      setCurrentConversationId(conv.id);
      setOptimisticMessages(chatMessages);
    } catch (err) {
      console.error('Failed to load multi-paper conversation:', err);
    } finally {
      setHasLoadedConversation(true);
    }
  }, [hasLoadedConversation, setCurrentConversationId, setOptimisticMessages]);

  // Load conversation on mount (only once)
  // Messages persist across paper selection changes
  useEffect(() => {
    if (!hasLoadedConversation) {
      loadExistingConversation();
    }
  }, [hasLoadedConversation, loadExistingConversation]);

  // When papers change, no need to update session anymore
  // The selectedPapers are already in the store
  // Messages persist across paper selection changes

  /**
   * Send a message to the multi-paper chat
   */
  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || selectedPapers.length === 0) return;

      // Create user message
      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: text,
        createdAt: new Date().toISOString(),
      };
      addOptimisticMessage(userMsg);

      try {
        setLoading(true);

        const paperIds = selectedPapers.map((p) => p.id);
        // Use the backend conversationId if we have one
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

        addOptimisticMessage(assistantMsg);
      } catch (err) {
        console.error('❌ Multi-paper chat error:', err);
        const errorMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content:
            '⚠️ Sorry, something went wrong while processing your question.',
          createdAt: new Date().toISOString(),
        };
        addOptimisticMessage(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    [
      selectedPapers,
      currentConversationId,
      addOptimisticMessage,
      setLoading,
      setCurrentConversationId,
    ],
  );

  /**
   * Clear the chat session
   */
  const clearChat = useCallback(() => {
    reset();
    setHasLoadedConversation(false);
  }, [reset]);

  return {
    selectedPapers,
    currentConversationId,
    isLoading,
    messages: optimisticMessages,
    sendMessage,
    clearChat,
    hasSelectedPapers: selectedPapers.length > 0,
    loadExistingConversation,
  };
}
