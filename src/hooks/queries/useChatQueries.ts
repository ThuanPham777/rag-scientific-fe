// src/hooks/queries/useChatQueries.ts
// React Query hooks for chat operations
// This is the primary source of truth for message data (server state)

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  sendQuery,
  getMessageHistory,
  explainRegion,
  clearChatHistory,
  askMultiPaper,
} from '../../services';
import type { ChatMessage } from '../../utils/types';

// Query keys
export const chatKeys = {
  all: ['chat'] as const,
  messages: () => [...chatKeys.all, 'messages'] as const,
  messageList: (conversationId: string) =>
    [...chatKeys.messages(), conversationId] as const,
};

/**
 * Hook to fetch message history for a conversation
 */
export function useMessageHistory(
  conversationId: string | undefined,
  paperId?: string,
) {
  return useQuery({
    queryKey: chatKeys.messageList(conversationId!),
    queryFn: () => getMessageHistory(conversationId!, paperId),
    enabled: !!conversationId,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook to send a chat message
 * Supports optimistic updates for better UX
 */
export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      question,
      paperId,
    }: {
      conversationId: string;
      question: string;
      paperId?: string;
    }) => {
      return sendQuery(conversationId, question, paperId);
    },
    onSuccess: (data, variables) => {
      // Update the message cache
      queryClient.setQueryData<ChatMessage[]>(
        chatKeys.messageList(variables.conversationId),
        (old) => (old ? [...old, data.assistantMsg] : [data.assistantMsg]),
      );
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || 'Failed to send message';
      toast.error(msg);
    },
  });
}

/**
 * Hook to send a multi-paper chat message
 */
export function useSendMultiPaperMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      paperIds,
      question,
      conversationId,
    }: {
      paperIds: string[];
      question: string;
      conversationId?: string;
    }) => {
      return askMultiPaper(paperIds, question, conversationId);
    },
    onSuccess: (data) => {
      if (data.conversationId) {
        // Update the message cache
        queryClient.setQueryData<ChatMessage[]>(
          chatKeys.messageList(data.conversationId),
          (old) => (old ? [...old, data.assistantMsg] : [data.assistantMsg]),
        );
      }
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || 'Failed to send message';
      toast.error(msg);
    },
  });
}

/**
 * Hook to explain a region (image) in the PDF
 */
export function useExplainRegion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      imageDataUrl,
      options,
    }: {
      imageDataUrl: string;
      options: {
        conversationId?: string;
        paperId?: string;
        pageNumber?: number;
        question?: string;
      };
    }) => {
      return explainRegion(imageDataUrl, options);
    },
    onSuccess: (data, variables) => {
      if (variables.options.conversationId) {
        queryClient.setQueryData<ChatMessage[]>(
          chatKeys.messageList(variables.options.conversationId),
          (old) => (old ? [...old, data.assistantMsg] : [data.assistantMsg]),
        );
      }
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || 'Failed to explain region';
      toast.error(msg);
    },
  });
}

/**
 * Hook to clear chat history
 */
export function useClearChatHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (conversationId: string) => clearChatHistory(conversationId),
    onSuccess: (_, conversationId) => {
      queryClient.setQueryData<ChatMessage[]>(
        chatKeys.messageList(conversationId),
        () => [],
      );
      toast.success('Chat history cleared');
    },
    onError: (error: any) => {
      const msg =
        error.response?.data?.message || 'Failed to clear chat history';
      toast.error(msg);
    },
  });
}
