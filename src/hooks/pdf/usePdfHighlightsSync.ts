// src/hooks/pdf/usePdfHighlightsSync.ts
// Hook that syncs PDF highlights with server API using React Query

import { useCallback, useMemo } from 'react';
import {
  useHighlights,
  useCreateHighlight,
  useDeleteHighlight,
  useUpdateHighlight,
  useAddComment,
} from '../queries';
import type { HighlightItem, SelectionRect } from '@/utils/types';

export type LocalHighlightRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

export type LocalHighlight = {
  id: string;
  pageNumber: number;
  rects: LocalHighlightRect[];
  text: string;
  color?: string;
  isTemporary?: boolean;
  commentCount?: number; // Number of comments on this highlight
};

// Map backend HighlightColor enum to hex colors
// Must match backend enum: YELLOW, GREEN, BLUE, PINK, ORANGE
const COLOR_MAP: Record<string, string> = {
  YELLOW: '#ffd700',
  GREEN: '#90ee90',
  BLUE: '#87ceeb',
  PINK: '#ffb6c1',
  ORANGE: '#ffa500',
};

// Map hex colors to backend HighlightColor enum
const HEX_TO_ENUM: Record<string, string> = {
  '#ffd700': 'YELLOW',
  '#90ee90': 'GREEN',
  '#87ceeb': 'BLUE',
  '#ffb6c1': 'PINK',
  '#ffa500': 'ORANGE',
};

export interface UsePdfHighlightsSyncOptions {
  paperId: string | undefined;
  pageRefs: React.MutableRefObject<Record<number, HTMLDivElement | null>>;
  enabled?: boolean;
}

/**
 * Convert backend SelectionRect (x, y) to frontend LocalHighlightRect (left, top)
 */
function toLocalRects(selectionRects: SelectionRect[]): LocalHighlightRect[] {
  return selectionRects.map((r) => ({
    left: r.x,
    top: r.y,
    width: r.width,
    height: r.height,
  }));
}

/**
 * Convert frontend LocalHighlightRect to backend SelectionRect
 */
function toSelectionRects(rects: LocalHighlightRect[]): SelectionRect[] {
  return rects.map((r) => ({
    x: r.left,
    y: r.top,
    width: r.width,
    height: r.height,
  }));
}

/**
 * Convert backend HighlightItem to local Highlight format
 */
function toLocalHighlight(item: HighlightItem): LocalHighlight {
  return {
    id: item.id,
    pageNumber: item.pageNumber,
    rects: toLocalRects(item.selectionRects),
    text: item.selectedText,
    color: COLOR_MAP[item.color] || '#ffd700',
    commentCount: item._count?.comments ?? 0,
  };
}

export function usePdfHighlightsSync(options: UsePdfHighlightsSyncOptions) {
  const { paperId, pageRefs, enabled = true } = options;

  // Fetch highlights from server
  const {
    data: serverHighlights,
    isLoading,
    error,
    refetch,
  } = useHighlights(paperId, enabled && !!paperId);

  // Mutations
  const createHighlightMutation = useCreateHighlight();
  const deleteHighlightMutation = useDeleteHighlight();
  const updateHighlightMutation = useUpdateHighlight();
  const addCommentMutation = useAddComment();

  // Convert server highlights to local format
  const highlights: LocalHighlight[] = useMemo(() => {
    if (!serverHighlights) return [];
    return serverHighlights.map(toLocalHighlight);
  }, [serverHighlights]);

  // Add a new highlight to the server
  const addHighlight = useCallback(
    async (
      pageNumber: number,
      text: string,
      rects: LocalHighlightRect[],
      color?: string,
      comment?: string,
    ) => {
      if (!paperId) {
        console.warn('Cannot add highlight: paperId is not set');
        return;
      }

      // Get the color enum or default to YELLOW
      const colorEnum = (color ? HEX_TO_ENUM[color] : 'YELLOW') || 'YELLOW';

      // Normalize rects to percentages
      const pageEl = pageRefs.current[pageNumber];
      const textLayer =
        (pageEl?.querySelector('.textLayer') as HTMLElement | null) || pageEl;

      let normalizedRects = rects;
      if (textLayer) {
        const pw = textLayer.clientWidth;
        const ph = textLayer.clientHeight;
        normalizedRects = rects.map((r) => ({
          top: r.top / ph,
          left: r.left / pw,
          width: r.width / pw,
          height: r.height / ph,
        }));
      }

      try {
        const result = await createHighlightMutation.mutateAsync({
          paperId,
          data: {
            pageNumber,
            selectionRects: toSelectionRects(normalizedRects),
            selectedText: text,
            color: colorEnum as any,
          },
        });

        // If comment was provided, add it to the highlight
        if (comment && result.data.id) {
          await addCommentMutation.mutateAsync({
            highlightId: result.data.id,
            content: comment,
            paperId,
          });
        }

        return result.data;
      } catch (error) {
        console.error('Failed to create highlight:', error);
        throw error;
      }
    },
    [paperId, pageRefs, createHighlightMutation, addCommentMutation],
  );

  // Remove a highlight from the server
  const removeHighlight = useCallback(
    async (highlightId: string) => {
      if (!paperId) {
        console.warn('Cannot remove highlight: paperId is not set');
        return;
      }

      try {
        await deleteHighlightMutation.mutateAsync({
          highlightId,
          paperId,
        });
      } catch (error) {
        console.error('Failed to delete highlight:', error);
        throw error;
      }
    },
    [paperId, deleteHighlightMutation],
  );

  // Update highlight color
  const updateHighlightColor = useCallback(
    async (highlightId: string, color: string) => {
      if (!paperId) {
        console.warn('Cannot update highlight: paperId is not set');
        return;
      }

      // Get the color enum or default to YELLOW
      const colorEnum = HEX_TO_ENUM[color] || 'YELLOW';

      try {
        await updateHighlightMutation.mutateAsync({
          highlightId,
          color: colorEnum as any,
          paperId,
        });
      } catch (error) {
        console.error('Failed to update highlight color:', error);
        throw error;
      }
    },
    [paperId, updateHighlightMutation],
  );

  // Find highlight by matching rects (for removal by selection)
  const removeHighlightByRects = useCallback(
    async (pageNumber: number, rects: LocalHighlightRect[]) => {
      if (!paperId || !highlights.length) return;

      const pageEl = pageRefs.current[pageNumber];
      const textLayer =
        (pageEl?.querySelector('.textLayer') as HTMLElement | null) || pageEl;
      const pw = textLayer?.clientWidth || 1;
      const ph = textLayer?.clientHeight || 1;

      // Calculate bounding box for the input rects
      const getBBox = (rs: LocalHighlightRect[]) => {
        const left = Math.min(...rs.map((r) => r.left));
        const top = Math.min(...rs.map((r) => r.top));
        const right = Math.max(...rs.map((r) => r.left + r.width));
        const bottom = Math.max(...rs.map((r) => r.top + r.height));
        return { left, top, right, bottom };
      };

      const overlapRatio = (
        a: ReturnType<typeof getBBox>,
        b: ReturnType<typeof getBBox>,
      ) => {
        const x1 = Math.max(a.left, b.left);
        const y1 = Math.max(a.top, b.top);
        const x2 = Math.min(a.right, b.right);
        const y2 = Math.min(a.bottom, b.bottom);
        if (x2 <= x1 || y2 <= y1) return 0;
        const inter = (x2 - x1) * (y2 - y1);
        const areaA = (a.right - a.left) * (a.bottom - a.top);
        const areaB = (b.right - b.left) * (b.bottom - b.top);
        return inter / Math.min(areaA, areaB);
      };

      const curBox = getBBox(rects);

      // Find matching highlight
      const matchingHighlight = highlights.find((h) => {
        if (h.pageNumber !== pageNumber) return false;

        // Convert stored rects (normalized 0-1) to pixel coords
        const storedRectsPx = h.rects.map((r) => {
          if (r.left <= 1 && r.width <= 1 && r.top <= 1 && r.height <= 1) {
            return {
              top: r.top * ph,
              left: r.left * pw,
              width: r.width * pw,
              height: r.height * ph,
            };
          }
          return r;
        });

        const storedBox = getBBox(storedRectsPx);
        return overlapRatio(curBox, storedBox) >= 0.85;
      });

      if (matchingHighlight) {
        await removeHighlight(matchingHighlight.id);
      }
    },
    [paperId, highlights, pageRefs, removeHighlight],
  );

  // Add comment to existing highlight
  const addComment = useCallback(
    async (highlightId: string, content: string) => {
      if (!paperId) {
        console.warn('Cannot add comment: paperId is not set');
        return;
      }

      try {
        await addCommentMutation.mutateAsync({
          highlightId,
          content,
          paperId,
        });
      } catch (error) {
        console.error('Failed to add comment:', error);
        throw error;
      }
    },
    [paperId, addCommentMutation],
  );

  return {
    highlights,
    isLoading,
    error,
    refetch,
    addHighlight,
    removeHighlight,
    removeHighlightByRects,
    updateHighlightColor,
    addComment,
    isCreating: createHighlightMutation.isPending,
    isDeleting: deleteHighlightMutation.isPending,
    isUpdating: updateHighlightMutation.isPending,
  };
}
