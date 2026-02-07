// src/hooks/queries/useConversationQueries.ts
// React Query hooks for conversation operations
// This is the primary source of truth for conversation data (server state)

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  listConversations,
  getConversation,
  createConversation,
  deleteConversation,
  startSession,
  listMultiPaperConversations,
} from '../../services';
import { chatKeys } from './useChatQueries';

// Query keys
export const conversationKeys = {
  all: ['conversations'] as const,
  lists: () => [...conversationKeys.all, 'list'] as const,
  list: (paperId?: string) =>
    [...conversationKeys.lists(), { paperId }] as const,
  multiPaper: () => [...conversationKeys.all, 'multi-paper'] as const,
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
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook to fetch multi-paper conversations
 */
export function useMultiPaperConversations() {
  return useQuery({
    queryKey: conversationKeys.multiPaper(),
    queryFn: async () => {
      const response = await listMultiPaperConversations();
      return response.data;
    },
    staleTime: 30 * 1000,
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
    staleTime: 60 * 1000, // 1 minute
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
    onError: (error: any) => {
      const msg =
        error.response?.data?.message || 'Failed to create conversation';
      toast.error(msg);
    },
  });
}

/**
 * Hook to start a new session (creates conversation)
 * Returns conversation ID for navigation
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
    onError: (error: any) => {
      const msg = error.response?.data?.message || 'Failed to start session';
      toast.error(msg);
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
      queryClient.removeQueries({
        queryKey: chatKeys.messageList(deletedId),
      });
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
      toast.success('Conversation deleted');
    },
    onError: (error: any) => {
      const msg =
        error.response?.data?.message || 'Failed to delete conversation';
      toast.error(msg);
    },
  });
}
