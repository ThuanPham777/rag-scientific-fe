import { deleteComment, updateComment } from '@/services/api/comment.api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { highlightKeys } from './useHighlightQueries';

/**
 * Update a comment's content
 */
export function useUpdateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      commentId,
      content,
    }: {
      commentId: string;
      content: string;
      highlightId: string;
    }) => updateComment(commentId, content),

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: highlightKeys.comments(variables.highlightId),
      });
      queryClient.invalidateQueries({
        queryKey: highlightKeys.byHighlight(variables.highlightId),
      });
    },
  });
}

/**
 * Delete a comment
 */
export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      commentId,
    }: {
      commentId: string;
      highlightId: string;
      paperId?: string;
    }) => deleteComment(commentId),

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
