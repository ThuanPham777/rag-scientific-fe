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
  addPaperToConversation,
  removePaperFromConversation,
  getSuggestedQuestions,
  generateSuggestedQuestions,
  generateFollowUpQuestions,
  getConversationHistory,
  updateConversation,
  closeConversation,
} from '../../services';
import { chatKeys } from './useChatQueries';
import type { ConversationHistoryItem } from '../../utils/types';

// Query keys
export const conversationKeys = {
  all: ['conversations'] as const,
  lists: () => [...conversationKeys.all, 'list'] as const,
  list: (paperId?: string) =>
    [...conversationKeys.lists(), { paperId }] as const,
  multiPaper: () => [...conversationKeys.all, 'multi-paper'] as const,
  history: () => [...conversationKeys.all, 'history'] as const,
  details: () => [...conversationKeys.all, 'detail'] as const,
  detail: (id: string) => [...conversationKeys.details(), id] as const,
};

/**
 * Hook to fetch conversation history with full stats
 */
export function useConversationHistory() {
  return useQuery<ConversationHistoryItem[]>({
    queryKey: conversationKeys.history(),
    queryFn: async () => {
      const response = await getConversationHistory();
      return response.data;
    },
    staleTime: 30 * 1000,
  });
}

/**
 * Hook to rename a conversation
 */
export function useUpdateConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      updateConversation(id, { title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: conversationKeys.history() });
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
      toast.success('Conversation renamed');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to rename conversation');
    },
  });
}

/**
 * Hook to close a conversation
 */
export function useCloseConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => closeConversation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: conversationKeys.history() });
      toast.success('Conversation closed');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to close conversation');
    },
  });
}

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

// ============================================================
// Suggested Questions
// ============================================================

export const suggestedQuestionKeys = {
  all: ['suggested-questions'] as const,
  list: (conversationId: string) =>
    [...suggestedQuestionKeys.all, conversationId] as const,
};

/**
 * Hook to fetch saved suggested questions for a conversation.
 * Runs on mount / page reload so "My Questions" is populated immediately.
 */
export function useSuggestedQuestions(conversationId?: string) {
  return useQuery({
    queryKey: suggestedQuestionKeys.list(conversationId!),
    queryFn: async () => {
      const response = await getSuggestedQuestions(conversationId!);
      return response.data; // SuggestedQuestionsResult
    },
    enabled: !!conversationId,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook to generate (brainstorm) suggested questions via RAG.
 * On success the saved-questions query is invalidated so the list refreshes.
 */
export function useGenerateSuggestedQuestions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      conversationId,
      textInput,
    }: {
      conversationId: string;
      textInput?: string;
    }) => generateSuggestedQuestions(conversationId, textInput),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: suggestedQuestionKeys.list(variables.conversationId),
      });
    },
    onError: (error: any) => {
      const msg =
        error.response?.data?.message || 'Failed to generate questions';
      toast.error(msg);
    },
  });
}

// ============================================================
// Follow-Up Questions (ephemeral, mutation only)
// ============================================================

/**
 * Mutation hook to generate follow-up questions for a specific assistant message.
 * Called right after the assistant response arrives – results are ephemeral.
 */
export function useGenerateFollowUpQuestions() {
  return useMutation({
    mutationFn: ({
      conversationId,
      messageId,
    }: {
      conversationId: string;
      messageId: string;
    }) => generateFollowUpQuestions(conversationId, messageId),
    onError: (error: any) => {
      console.error('Follow-up questions failed:', error);
    },
  });
}

// ============================================================
// Multi-Paper Session Management
// ============================================================

export function useAddPaperToConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ conversationId, paperId }: { conversationId: string; paperId: string }) =>
      addPaperToConversation(conversationId, paperId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: conversationKeys.detail(variables.conversationId),
      });
      toast.success('Paper added to session');
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || 'Failed to add paper';
      toast.error(msg);
    },
  });
}

export function useRemovePaperFromConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ conversationId, paperId }: { conversationId: string; paperId: string }) =>
      removePaperFromConversation(conversationId, paperId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: conversationKeys.detail(variables.conversationId),
      });
      toast.success('Paper removed from session');
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || 'Failed to remove paper';
      toast.error(msg);
    },
  });
}
