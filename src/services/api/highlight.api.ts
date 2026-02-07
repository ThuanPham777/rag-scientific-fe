import type {
  HighlightComment,
  HighlightItem,
  HighlightItemWithComments,
} from '@/utils/types';
import api from '../../config/axios';

// ============================================================================
// Types for API requests
// ============================================================================

export type SelectionRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

// Must match backend HighlightColor enum
export type HighlightColor = 'YELLOW' | 'GREEN' | 'BLUE' | 'PINK' | 'ORANGE';

export type CreateHighlightRequest = {
  pageNumber: number;
  selectionRects: SelectionRect[];
  selectedText: string;
  textPrefix?: string;
  textSuffix?: string;
  color?: HighlightColor;
};

export type UpdateHighlightRequest = {
  color: HighlightColor;
};

// ============================================================================
// Highlight API Functions
// ============================================================================

/**
 * Create a new highlight on a paper
 */
export async function createHighlight(
  paperId: string,
  data: CreateHighlightRequest,
): Promise<{
  success: boolean;
  data: HighlightItem;
}> {
  const response = await api.post(`/papers/${paperId}/highlights`, data);
  return { success: true, data: response.data.data || response.data };
}

/**
 * Get all highlights for a paper
 * @param paperId - Paper ID
 * @param pageNumber - Optional page number filter
 */
export async function getHighlightsByPaper(
  paperId: string,
  pageNumber?: number,
): Promise<{
  success: boolean;
  data: HighlightItem[];
}> {
  const params = pageNumber ? { page: pageNumber } : {};
  const response = await api.get(`/papers/${paperId}/highlights`, { params });
  return { success: true, data: response.data.data || response.data };
}

/**
 * Get a single highlight with its comments
 */
export async function getHighlightWithComments(highlightId: string): Promise<{
  success: boolean;
  data: HighlightItemWithComments;
}> {
  const response = await api.get(`/highlights/${highlightId}`);
  return { success: true, data: response.data.data || response.data };
}

/**
 * Update a highlight's color
 */
export async function updateHighlight(
  highlightId: string,
  data: UpdateHighlightRequest,
): Promise<{
  success: boolean;
  data: HighlightItem;
}> {
  const response = await api.patch(`/highlights/${highlightId}`, data);
  return { success: true, data: response.data.data || response.data };
}

/**
 * Delete a highlight and all its comments
 */
export async function deleteHighlight(highlightId: string): Promise<{
  success: boolean;
  message: string;
}> {
  const response = await api.delete(`/highlights/${highlightId}`);
  return {
    success: true,
    message: response.data.message || 'Highlight deleted',
  };
}

// ============================================================================
// Comment API Functions (nested under highlights)
// ============================================================================

/**
 * Add a comment to a highlight
 */
export async function createComment(
  highlightId: string,
  content: string,
): Promise<{
  success: boolean;
  data: HighlightComment;
}> {
  const response = await api.post(`/highlights/${highlightId}/comments`, {
    content,
  });
  return { success: true, data: response.data.data || response.data };
}

/**
 * Get all comments for a highlight
 */
export async function getCommentsByHighlight(highlightId: string): Promise<{
  success: boolean;
  data: HighlightComment[];
}> {
  const response = await api.get(`/highlights/${highlightId}/comments`);
  return { success: true, data: response.data.data || response.data };
}
