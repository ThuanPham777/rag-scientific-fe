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
  toggleReaction,
  replyToMessage,
  deleteMessageApi,
} from '../../services';
import type { ChatMessage, ReactionAggregate } from '../../utils/types';

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
 * Hook to clear chat history for a single conversation.
 * Only used for SINGLE_PAPER / MULTI_PAPER conversations (not GROUP).
 */
export function useClearChatHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (conversationId: string) => clearChatHistory(conversationId),
    onSuccess: (_, conversationId) => {
      // Clear both flat and infinite query caches for this conversation
      queryClient.setQueryData<ChatMessage[]>(
        chatKeys.messageList(conversationId),
        () => [],
      );
      queryClient.removeQueries({
        queryKey: chatKeys.infiniteMessages(conversationId),
      });
      toast.success('Chat history cleared');
    },
    onError: (error: any) => {
      const msg =
        error.response?.data?.message || 'Failed to clear chat history';
      toast.error(msg);
    },
  });
}

// =========================================================================
// REACTION HOOKS
// =========================================================================

/**
 * Hook to toggle a reaction on a message.
 * Optimistically updates the reaction list in the infinite query cache.
 */
export function useToggleReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      messageId,
      emoji,
    }: {
      messageId: string;
      emoji: string;
      conversationId: string;
      currentUserId: string;
    }) => {
      return toggleReaction(messageId, emoji);
    },
    onMutate: async ({ messageId, emoji, conversationId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: chatKeys.infiniteMessages(conversationId),
      });

      // Snapshot previous data
      const previousData = queryClient.getQueryData(
        chatKeys.infiniteMessages(conversationId),
      );

      // Optimistic update
      queryClient.setQueryData<any>(
        chatKeys.infiniteMessages(conversationId),
        (old: any) => {
          if (!old?.pages) return old;
          return {
            ...old,
            pages: old.pages.map((page: any) => ({
              ...page,
              items: page.items.map((msg: ChatMessage) => {
                if (msg.id !== messageId) return msg;
                const reactions = [...(msg.reactions || [])];
                const existingIdx = reactions.findIndex((r) => r.hasReacted);

                if (
                  existingIdx >= 0 &&
                  reactions[existingIdx].emoji === emoji
                ) {
                  // Toggle off
                  if (reactions[existingIdx].count <= 1) {
                    reactions.splice(existingIdx, 1);
                  } else {
                    reactions[existingIdx] = {
                      ...reactions[existingIdx],
                      count: reactions[existingIdx].count - 1,
                      hasReacted: false,
                    };
                  }
                } else {
                  // Remove old reaction if exists, inherit its timestamp
                  let inheritedTimestamp: string | undefined;
                  if (existingIdx >= 0) {
                    inheritedTimestamp = reactions[existingIdx].firstReactedAt;
                    if (reactions[existingIdx].count <= 1) {
                      reactions.splice(existingIdx, 1);
                    } else {
                      reactions[existingIdx] = {
                        ...reactions[existingIdx],
                        count: reactions[existingIdx].count - 1,
                        hasReacted: false,
                      };
                    }
                  }
                  // Add new reaction
                  const newTargetIdx = reactions.findIndex(
                    (r) => r.emoji === emoji,
                  );
                  if (newTargetIdx >= 0) {
                    reactions[newTargetIdx] = {
                      ...reactions[newTargetIdx],
                      count: reactions[newTargetIdx].count + 1,
                      hasReacted: true,
                    };
                  } else {
                    reactions.push({
                      emoji,
                      count: 1,
                      hasReacted: true,
                      firstReactedAt:
                        inheritedTimestamp || new Date().toISOString(),
                    });
                  }
                }

                return { ...msg, reactions };
              }),
            })),
          };
        },
      );

      return { previousData };
    },
    onError: (_err, { conversationId }, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          chatKeys.infiniteMessages(conversationId),
          context.previousData,
        );
      }
      toast.error('Failed to toggle reaction');
    },
    onSettled: (_data, _err, { conversationId }) => {
      // Mark cache as stale so next time the query is accessed it refetches.
      // We do NOT force an immediate refetch because:
      //   - Collaborative sessions get authoritative reactions via WebSocket
      //     (session:reaction-update → updateMessageReactionsInCache)
      //   - Non-collaborative sessions will refetch on next window focus or
      //     component mount.
      // Using refetchType: 'none' avoids the race condition where a refetch
      // overwrites the optimistic/socket-driven cache update.
      queryClient.invalidateQueries({
        queryKey: chatKeys.infiniteMessages(conversationId),
        refetchType: 'none',
      });
    },
  });
}

// =========================================================================
// REPLY HOOKS
// =========================================================================

/**
 * Hook to reply to a message.
 */
export function useReplyToMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      replyToMessageId,
      content,
    }: {
      conversationId: string;
      replyToMessageId: string;
      content: string;
    }) => {
      return replyToMessage(conversationId, replyToMessageId, content);
    },
    onSuccess: (_data, { conversationId }) => {
      // Invalidate message cache so the reply appears from server
      queryClient.invalidateQueries({
        queryKey: chatKeys.infiniteMessages(conversationId),
      });
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || 'Failed to send reply';
      toast.error(msg);
    },
  });
}

// =========================================================================
// DELETE MESSAGE HOOKS
// =========================================================================

/**
 * Hook to soft-delete a message.
 * Optimistically replaces content in the cache.
 */
export function useDeleteMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      messageId,
    }: {
      conversationId: string;
      messageId: string;
    }) => {
      return deleteMessageApi(conversationId, messageId);
    },
    onMutate: async ({ conversationId, messageId }) => {
      await queryClient.cancelQueries({
        queryKey: chatKeys.infiniteMessages(conversationId),
      });

      const previousData = queryClient.getQueryData(
        chatKeys.infiniteMessages(conversationId),
      );

      // Optimistic update: remove the message from the list immediately
      queryClient.setQueryData<any>(
        chatKeys.infiniteMessages(conversationId),
        (old: any) => {
          if (!old?.pages) return old;
          return {
            ...old,
            pages: old.pages.map((page: any) => ({
              ...page,
              items: page.items.filter(
                (msg: ChatMessage) => msg.id !== messageId,
              ),
            })),
          };
        },
      );

      return { previousData };
    },
    onError: (_err, { conversationId }, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          chatKeys.infiniteMessages(conversationId),
          context.previousData,
        );
      }
      toast.error('Failed to delete message');
    },
    onSuccess: () => {
      toast.success('Message deleted');
    },
  });
}

/**
 * Helper to update reactions for a specific message in the infinite query cache.
 * Used by WebSocket event handlers.
 */
export function updateMessageReactionsInCache(
  queryClient: ReturnType<typeof useQueryClient>,
  conversationId: string,
  messageId: string,
  reactions: ReactionAggregate[],
) {
  queryClient.setQueryData<any>(
    chatKeys.infiniteMessages(conversationId),
    (old: any) => {
      if (!old?.pages) return old;
      return {
        ...old,
        pages: old.pages.map((page: any) => ({
          ...page,
          items: page.items.map((msg: ChatMessage) => {
            if (msg.id !== messageId) return msg;
            return { ...msg, reactions };
          }),
        })),
      };
    },
  );
}

/**
 * Helper to mark a message as deleted in the infinite query cache.
 * Used by WebSocket event handlers.
 */
export function markMessageDeletedInCache(
  queryClient: ReturnType<typeof useQueryClient>,
  conversationId: string,
  messageId: string,
) {
  queryClient.setQueryData<any>(
    chatKeys.infiniteMessages(conversationId),
    (old: any) => {
      if (!old?.pages) return old;
      return {
        ...old,
        pages: old.pages.map((page: any) => ({
          ...page,
          items: page.items.filter((msg: ChatMessage) => msg.id !== messageId),
        })),
      };
    },
  );
}
