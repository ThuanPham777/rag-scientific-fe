// src/hooks/queries/useChatQueries.ts
// React Query hooks for chat operations

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sendQuery, getMessageHistory, explainRegion } from '../../services';
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
  });
}

/**
 * Hook to send a chat message
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
  });
}
