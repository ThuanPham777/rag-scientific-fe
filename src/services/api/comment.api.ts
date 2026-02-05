import type { HighlightComment } from '@/utils/types';
import api from '../../config/axios';

export async function updateComment(
  commentId: string,
  content: string,
): Promise<{
  success: boolean;
  data: HighlightComment;
}> {
  const { data } = await api.patch(`/comments/${commentId}`, { content });
  return { success: true, data: data.data || data };
}

export async function deleteComment(
  commentId: string,
): Promise<{ success: boolean }> {
  const { data } = await api.delete(`/comments/${commentId}`);
  return data;
}
