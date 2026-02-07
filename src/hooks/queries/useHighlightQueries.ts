import {
  createComment,
  createHighlight,
  deleteHighlight,
  getCommentsByHighlight,
  getHighlightsByPaper,
  getHighlightWithComments,
  updateHighlight,
  type CreateHighlightRequest,
  type HighlightColor,
} from '@/services/api/highlight.api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// ============================================================================
// Query Keys
// ============================================================================

export const highlightKeys = {
  all: ['highlights'] as const,

  byPaper: (paperId: string) =>
    [...highlightKeys.all, 'paper', paperId] as const,

  byHighlight: (highlightId: string) =>
    [...highlightKeys.all, 'highlight', highlightId] as const,

  comments: (highlightId: string) =>
    [...highlightKeys.all, 'comments', highlightId] as const,
};

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Get all highlights for a paper
 */
export function useHighlights(paperId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: highlightKeys.byPaper(paperId || ''),
    queryFn: async () => {
      if (!paperId) throw new Error('Paper ID is required');
      const res = await getHighlightsByPaper(paperId);
      return res.data;
    },
    enabled: enabled && !!paperId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Get a single highlight with its comments
 */
export function useHighlightWithComments(
  highlightId: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: highlightKeys.byHighlight(highlightId || ''),
    queryFn: async () => {
      if (!highlightId) throw new Error('Highlight ID is required');
      const res = await getHighlightWithComments(highlightId);
      return res.data;
    },
    enabled: enabled && !!highlightId,
  });
}

/**
 * Get all comments for a highlight
 */
export function useHighlightComments(
  highlightId: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: highlightKeys.comments(highlightId || ''),
    queryFn: async () => {
      if (!highlightId) throw new Error('Highlight ID is required');
      const res = await getCommentsByHighlight(highlightId);
      return res.data;
    },
    enabled: enabled && !!highlightId,
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Create a new highlight
 */
export function useCreateHighlight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      paperId,
      data,
    }: {
      paperId: string;
      data: CreateHighlightRequest;
    }) => createHighlight(paperId, data),

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: highlightKeys.byPaper(variables.paperId),
      });
    },
  });
}

/**
 * Update a highlight's color
 */
export function useUpdateHighlight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      highlightId,
      color,
    }: {
      highlightId: string;
      color: HighlightColor;
      paperId: string;
    }) => updateHighlight(highlightId, { color }),

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: highlightKeys.byPaper(variables.paperId),
      });
      queryClient.invalidateQueries({
        queryKey: highlightKeys.byHighlight(variables.highlightId),
      });
    },
  });
}

/**
 * Delete a highlight
 */
export function useDeleteHighlight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ highlightId }: { highlightId: string; paperId: string }) =>
      deleteHighlight(highlightId),

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: highlightKeys.byPaper(variables.paperId),
      });
      queryClient.removeQueries({
        queryKey: highlightKeys.byHighlight(variables.highlightId),
      });
    },
  });
}

/**
 * Add a comment to a highlight
 */
export function useAddComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      highlightId,
      content,
    }: {
      highlightId: string;
      content: string;
      paperId?: string;
    }) => createComment(highlightId, content),

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: highlightKeys.comments(variables.highlightId),
      });
      queryClient.invalidateQueries({
        queryKey: highlightKeys.byHighlight(variables.highlightId),
      });
      // Also invalidate paper highlights to update comment count in UI
      if (variables.paperId) {
        queryClient.invalidateQueries({
          queryKey: highlightKeys.byPaper(variables.paperId),
        });
      }
    },
  });
}
