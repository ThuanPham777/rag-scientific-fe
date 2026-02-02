// src/hooks/queries/useConversationQueries.ts
// React Query hooks for conversation operations

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listConversations,
  getConversation,
  createConversation,
  deleteConversation,
  startSession,
} from '../../services';

// Query keys
export const conversationKeys = {
  all: ['conversations'] as const,
  lists: () => [...conversationKeys.all, 'list'] as const,
  list: (paperId?: string) =>
    [...conversationKeys.lists(), { paperId }] as const,
  details: () => [...conversationKeys.all, 'detail'] as const,
  detail: (id: string) => [...conversationKeys.details(), id] as const,
};

/**
 * Hook to fetch conversations, optionally filtered by paper
 */
export function useConversations(paperId?: string) {
  return useQuery({
    queryKey: conversationKeys.list(paperId),
    queryFn: async () => {
      const response = await listConversations(paperId);
      return response.data;
    },
  });
}

/**
 * Hook to fetch a single conversation
 */
export function useConversation(id: string | undefined) {
  return useQuery({
    queryKey: conversationKeys.detail(id!),
    queryFn: async () => {
      const response = await getConversation(id!);
      return response.data;
    },
    enabled: !!id,
  });
}

/**
 * Hook to create a new conversation
 */
export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ paperId, title }: { paperId: string; title?: string }) =>
      createConversation(paperId, title),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
      queryClient.setQueryData(
        conversationKeys.detail(data.data.id),
        data.data,
      );
    },
  });
}

/**
 * Hook to start a new session (creates conversation)
 */
export function useStartSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      paperId,
      ragFileId,
    }: {
      paperId: string;
      ragFileId?: string;
    }) => startSession(paperId, ragFileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
    },
  });
}

/**
 * Hook to delete a conversation
 */
export function useDeleteConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteConversation(id),
    onSuccess: (_, deletedId) => {
      queryClient.removeQueries({
        queryKey: conversationKeys.detail(deletedId),
      });
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
    },
  });
}
