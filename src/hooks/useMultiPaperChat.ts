// src/hooks/useMultiPaperChat.ts
// Custom hook for multi-paper chat logic
// ONE persistent conversation for all multi-paper chats

import { useCallback, useEffect, useState } from 'react';
import { useMultiPaperChatStore } from '../store/useMultiPaperChatStore';
import {
  askMultiPaper,
  getMessageHistory,
  listMultiPaperConversations,
} from '../services';
import type { ChatMessage } from '../utils/types';

export function useMultiPaperChat() {
  const {
    selectedPapers,
    session,
    isLoading,
    addMessage,
    setLoading,
    clearSession,
    setConversationId,
    setSession,
  } = useMultiPaperChatStore();

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

      // Set session with loaded data - papers are current selection, messages are from DB
      setSession({
        id: crypto.randomUUID(),
        conversationId: conv.id,
        paperIds: selectedPapers.map((p) => p.id),
        papers: selectedPapers,
        messages: chatMessages,
      });
    } catch (err) {
      console.error('Failed to load multi-paper conversation:', err);
    } finally {
      setHasLoadedConversation(true);
    }
  }, [hasLoadedConversation, setSession, selectedPapers]);

  // Load conversation on mount (only once)
  // Messages persist across paper selection changes
  useEffect(() => {
    if (!hasLoadedConversation) {
      loadExistingConversation();
    }
  }, [hasLoadedConversation, loadExistingConversation]);

  // When papers change, just update the session's paper list
  // DO NOT reset the conversation or messages
  useEffect(() => {
    if (session && selectedPapers.length > 0) {
      // Update papers in session without clearing messages
      setSession({
        ...session,
        paperIds: selectedPapers.map((p) => p.id),
        papers: selectedPapers,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPapers]);

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
      addMessage(userMsg);

      try {
        setLoading(true);

        const paperIds = selectedPapers.map((p) => p.id);
        // Use the backend conversationId if we have one, NOT the local session.id
        const { assistantMsg, conversationId: returnedConvId } =
          await askMultiPaper(paperIds, text, session?.conversationId);

        // Store the backend conversation ID for subsequent messages
        if (returnedConvId && !session?.conversationId) {
          setConversationId(returnedConvId);
        }

        addMessage(assistantMsg);
      } catch (err) {
        console.error('❌ Multi-paper chat error:', err);
        const errorMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content:
            '⚠️ Sorry, something went wrong while processing your question.',
          createdAt: new Date().toISOString(),
        };
        addMessage(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    [selectedPapers, session, addMessage, setLoading, setConversationId],
  );

  /**
   * Clear the chat session
   */
  const clearChat = useCallback(() => {
    clearSession();
    setHasLoadedConversation(false);
  }, [clearSession]);

  return {
    selectedPapers,
    session,
    isLoading,
    messages: session?.messages || [],
    sendMessage,
    clearChat,
    hasSelectedPapers: selectedPapers.length > 0,
    loadExistingConversation,
  };
}
