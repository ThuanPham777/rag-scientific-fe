// Jump/Navigation hook - handles jumping to specific pages and highlights
import { useEffect, useCallback } from 'react';

export type HighlightRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

export type JumpHighlight = {
  pageNumber: number;
  rect: HighlightRect;
};

export interface UseJumpOptions {
  pageRefs: React.MutableRefObject<Record<number, HTMLDivElement | null>>;
  numPages: number;
  onAddTemporaryHighlight?: (pageNumber: number, rect: HighlightRect) => void;
}

export function usePdfJump(options: UseJumpOptions) {
  const { pageRefs, onAddTemporaryHighlight } = options;

  // Jump to page with retry logic
  const jumpToPage = useCallback(
    (targetPage: number) => {
      if (!targetPage || targetPage < 1) return;

      let retryCount = 0;
      const maxRetries = 30;

      const attemptJump = () => {
        const pageEl = pageRefs.current[targetPage];
        if (pageEl) {
          pageEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return true;
        }
        return false;
      };

      if (attemptJump()) return;

      const interval = setInterval(() => {
        retryCount++;
        if (attemptJump() || retryCount >= maxRetries) {
          clearInterval(interval);
        }
      }, 100);

      return () => clearInterval(interval);
    },
    [pageRefs],
  );

  // Jump to highlight with scroll and temporary highlight
  const jumpToHighlight = useCallback(
    (highlight: JumpHighlight | null | undefined) => {
      if (!highlight) return;
      const { pageNumber, rect } = highlight;

      let retryCount = 0;
      const maxRetries = 30;

      const attemptJump = () => {
        const pageEl = pageRefs.current[pageNumber];
        if (pageEl) {
          pageEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return true;
        }
        return false;
      };

      if (attemptJump()) {
        onAddTemporaryHighlight?.(pageNumber, rect);
        return;
      }

      const interval = setInterval(() => {
        retryCount++;
        if (attemptJump() || retryCount >= maxRetries) {
          clearInterval(interval);
          if (retryCount < maxRetries) {
            onAddTemporaryHighlight?.(pageNumber, rect);
          }
        }
      }, 100);

      return () => clearInterval(interval);
    },
    [pageRefs, onAddTemporaryHighlight],
  );

  return {
    jumpToPage,
    jumpToHighlight,
  };
}

// Hook to handle jump effects from props
export function usePdfJumpEffect(
  jumpToPage: number | undefined,
  jumpHighlight: JumpHighlight | null | undefined,
  options: UseJumpOptions,
) {
  const { pageRefs, onAddTemporaryHighlight } = options;

  // Jump to page effect
  useEffect(() => {
    if (!jumpToPage) return;

    let retryCount = 0;
    const maxRetries = 30;

    const attemptJump = () => {
      const pageEl = pageRefs.current[jumpToPage];
      if (pageEl) {
        pageEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return true;
      }
      return false;
    };

    if (attemptJump()) return;

    const interval = setInterval(() => {
      retryCount++;
      if (attemptJump() || retryCount >= maxRetries) {
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [jumpToPage, pageRefs]);

  // Jump to highlight effect
  useEffect(() => {
    if (!jumpHighlight) return;
    const { pageNumber, rect } = jumpHighlight;

    let retryCount = 0;
    const maxRetries = 30;

    const attemptJump = () => {
      const pageEl = pageRefs.current[pageNumber];
      if (pageEl) {
        pageEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return true;
      }
      return false;
    };

    if (attemptJump()) {
      onAddTemporaryHighlight?.(pageNumber, rect);
      return;
    }

    const interval = setInterval(() => {
      retryCount++;
      if (attemptJump() || retryCount >= maxRetries) {
        clearInterval(interval);
        if (retryCount < maxRetries) {
          onAddTemporaryHighlight?.(pageNumber, rect);
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [jumpHighlight, pageRefs, onAddTemporaryHighlight]);
}
