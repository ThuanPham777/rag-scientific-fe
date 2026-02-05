// Highlights hook - manages highlight annotations
import { useState, useCallback } from 'react';

export type HighlightRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

export type Highlight = {
  id: string;
  pageNumber: number;
  rects: HighlightRect[];
  text: string;
  color?: string;
};

export interface UseHighlightsOptions {
  pageRefs: React.MutableRefObject<Record<number, HTMLDivElement | null>>;
}

// Utility functions
const getBBox = (rects: HighlightRect[]) => {
  const left = Math.min(...rects.map((r) => r.left));
  const top = Math.min(...rects.map((r) => r.top));
  const right = Math.max(...rects.map((r) => r.left + r.width));
  const bottom = Math.max(...rects.map((r) => r.top + r.height));
  return {
    left,
    top,
    right,
    bottom,
    width: right - left,
    height: bottom - top,
  };
};

const overlapRatio = (
  a: { left: number; top: number; right: number; bottom: number },
  b: { left: number; top: number; right: number; bottom: number },
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

export function usePdfHighlights(options: UseHighlightsOptions) {
  const { pageRefs } = options;
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [lastColor, setLastColor] = useState<string | undefined>('#ffd700');

  const addHighlight = useCallback(
    (
      pageNumber: number,
      text: string,
      rects: HighlightRect[],
      color?: string,
    ) => {
      const pageEl = pageRefs.current[pageNumber];
      const textLayer =
        (pageEl?.querySelector('.textLayer') as HTMLElement | null) || pageEl;

      // Normalize to percentages for storage
      let normalized = rects;
      if (textLayer) {
        const pw = textLayer.clientWidth;
        const ph = textLayer.clientHeight;
        normalized = rects.map((r) => ({
          top: r.top / ph,
          left: r.left / pw,
          width: r.width / pw,
          height: r.height / ph,
        }));
      }

      setHighlights((hs) => {
        const pw = textLayer?.clientWidth || 1;
        const ph = textLayer?.clientHeight || 1;
        const newBox = getBBox(rects);

        // Filter out overlapping highlights
        const filtered = hs.filter((h) => {
          if (h.pageNumber !== pageNumber) return true;
          const oldRectsPx = h.rects.map((r) => {
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
          const oldBox = getBBox(oldRectsPx);
          const ratio = overlapRatio(newBox, oldBox);
          const areaNew = newBox.width * newBox.height;
          const areaOld = oldBox.width * oldBox.height;
          return !(ratio > 0.85 && areaNew >= areaOld * 0.9);
        });

        return [
          ...filtered,
          {
            id: crypto.randomUUID(),
            pageNumber,
            rects: normalized,
            text,
            color,
          },
        ];
      });
    },
    [pageRefs],
  );

  const removeHighlight = useCallback(
    (pageNumber: number, rects: HighlightRect[]) => {
      setHighlights((hs) => {
        const pageEl = pageRefs.current[pageNumber];
        const textLayer =
          (pageEl?.querySelector('.textLayer') as HTMLElement | null) || pageEl;
        const pw = textLayer?.clientWidth || 1;
        const ph = textLayer?.clientHeight || 1;
        const curBox = getBBox(rects);

        return hs.filter((h) => {
          if (h.pageNumber !== pageNumber) return true;
          const oldRectsPx = h.rects.map((r) => {
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
          const oldBox = getBBox(oldRectsPx);
          return overlapRatio(curBox, oldBox) < 0.85;
        });
      });
    },
    [pageRefs],
  );

  const addTemporaryHighlight = useCallback(
    (pageNumber: number, rect: HighlightRect, duration = 5000) => {
      const id = `jump-${pageNumber}-${Date.now()}`;

      // Clear existing jump highlights and add new one
      setHighlights((prev) => [
        ...prev.filter((x) => !x.id.startsWith('jump-')),
        { id, pageNumber, rects: [rect], text: '', color: '#fff3b0' },
      ]);

      // Remove after duration
      setTimeout(() => {
        setHighlights((prev) => prev.filter((x) => !x.id.startsWith('jump-')));
      }, duration);

      return id;
    },
    [],
  );

  const clearHighlights = useCallback(() => {
    setHighlights([]);
  }, []);

  return {
    highlights,
    setHighlights,
    lastColor,
    setLastColor,
    addHighlight,
    removeHighlight,
    addTemporaryHighlight,
    clearHighlights,
  };
}
