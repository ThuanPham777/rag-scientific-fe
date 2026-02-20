// src/hooks/queries/useChatQueries.ts
// React Query hooks for chat operations
// This is the primary source of truth for message data (server state)

import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from '@tanstack/react-query';
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
  infiniteMessages: (conversationId: string) =>
    [...chatKeys.messages(), conversationId, 'infinite'] as const,
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
    queryFn: async () => {
      const result = await getMessageHistory(conversationId!, paperId);
      return result.items;
    },
    enabled: !!conversationId,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook for cursor-paginated infinite message history.
 * Backend returns messages in DESC order (newest first).
 * Pages: page 0 = newest, page 1 = older, page 2 = even older...
 *
 * Use `flattenMessages(data)` helper to get display-ordered (ASC) array.
 */
export function useInfiniteMessageHistory(
  conversationId: string | undefined,
  paperId?: string,
  limit: number = 20,
) {
  return useInfiniteQuery({
    queryKey: chatKeys.infiniteMessages(conversationId!),
    queryFn: ({ pageParam }) =>
      getMessageHistory(conversationId!, paperId, pageParam, limit),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasNext ? lastPage.nextCursor : undefined,
    enabled: !!conversationId,
    staleTime: 5 * 60 * 1000, // 5 minutes — historical messages don't change
    refetchOnWindowFocus: false,
  });
}

/**
 * Flatten infinite-query pages into a single ASC-ordered array for display.
 * Pages come in [newest page, older page, ...], each page's items are DESC.
 * Result: oldest message first → newest message last.
 */
export function flattenMessagePages(
  data: { pages: { items: ChatMessage[] }[] } | undefined,
): ChatMessage[] {
  if (!data?.pages) return [];
  // Reverse the pages array so oldest page comes first,
  // then reverse items within each page (they arrive DESC).
  const result: ChatMessage[] = [];
  for (let i = data.pages.length - 1; i >= 0; i--) {
    const pageItems = data.pages[i].items;
    for (let j = pageItems.length - 1; j >= 0; j--) {
      result.push(pageItems[j]);
    }
  }
  return result;
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
      conversationId?: string | null;
      question: string;
      paperId?: string;
    }) => {
      return sendQuery(conversationId ?? null, question, paperId);
    },
    onSuccess: (data, variables) => {
      // Update the message cache
      queryClient.setQueryData<ChatMessage[]>(
        chatKeys.messageList(variables.conversationId || ''),
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
