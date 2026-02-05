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
  viewerScrollRef?: React.RefObject<HTMLDivElement | null>;
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
  const { pageRefs, viewerScrollRef, numPages, onAddTemporaryHighlight } =
    options;

  // Jump to page effect - wait for PDF to load first
  useEffect(() => {
    if (!jumpToPage) return;
    // Wait for PDF to be loaded (numPages > 0) before attempting jump
    if (numPages === 0) {
      console.log(
        '[usePdfJumpEffect] Waiting for PDF to load, numPages:',
        numPages,
      );
      return;
    }

    console.log(
      '[usePdfJumpEffect] Effect triggered - jumpToPage:',
      jumpToPage,
      'numPages:',
      numPages,
    );

    let retryCount = 0;
    // Increase max retries to 100 (10 seconds) to handle slower PDF loading in new tabs
    const maxRetries = 100;
    let hasJumped = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const scrollPageIntoView = (
      pageEl: HTMLDivElement,
      block: 'start' | 'center' = 'start',
    ) => {
      const scrollContainer = viewerScrollRef?.current;
      console.log(
        '[usePdfJumpEffect] scrollContainer available:',
        !!scrollContainer,
      );

      if (scrollContainer) {
        // Use offsetTop for more reliable positioning
        const pageOffsetTop = pageEl.offsetTop;

        let targetScrollTop: number;
        if (block === 'start') {
          // Scroll so page is at the top of container with some padding
          targetScrollTop = pageOffsetTop - 20;
        } else {
          // Scroll so page is centered in container
          const containerHeight = scrollContainer.clientHeight;
          targetScrollTop =
            pageOffsetTop - containerHeight / 2 + pageEl.offsetHeight / 2;
        }

        console.log('[usePdfJumpEffect] Executing scroll:', {
          pageOffsetTop,
          targetScrollTop,
          containerScrollHeight: scrollContainer.scrollHeight,
        });

        scrollContainer.scrollTo({
          top: Math.max(0, targetScrollTop),
          behavior: 'smooth',
        });
      } else {
        // Fallback to scrollIntoView if no container ref
        console.log(
          '[usePdfJumpEffect] Using scrollIntoView fallback (no container)',
        );
        pageEl.scrollIntoView({ behavior: 'smooth', block });
      }
    };

    const attemptJump = () => {
      const pageEl = pageRefs.current[jumpToPage];
      const scrollContainer = viewerScrollRef?.current;

      // Wait for both page element AND scroll container to be ready
      if (!scrollContainer) {
        console.log('[usePdfJumpEffect] Scroll container not ready yet');
        return false;
      }

      if (!pageEl) {
        console.log(
          '[usePdfJumpEffect] Page element not ready yet for page:',
          jumpToPage,
        );
        return false;
      }

      if (hasJumped) {
        return true;
      }

      console.log('[usePdfJumpEffect] Jump to page executing:', jumpToPage);
      scrollPageIntoView(pageEl, 'start');
      hasJumped = true;
      return true;
    };

    // Delay first attempt to ensure DOM is ready after route change
    const initialDelay = setTimeout(() => {
      if (attemptJump()) return;

      console.log(
        '[usePdfJumpEffect] Starting retry loop for page:',
        jumpToPage,
      );
      intervalId = setInterval(() => {
        retryCount++;
        if (attemptJump() || retryCount >= maxRetries) {
          if (intervalId) clearInterval(intervalId);
          if (retryCount >= maxRetries && !hasJumped) {
            console.log(
              '[usePdfJumpEffect] Max retries reached for page:',
              jumpToPage,
              'pageRefs available:',
              Object.keys(pageRefs.current),
            );
          }
        }
      }, 100);
    }, 300); // Increase initial delay for new tab scenarios

    return () => {
      clearTimeout(initialDelay);
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [jumpToPage, pageRefs, viewerScrollRef, numPages]);

  // Jump to highlight effect - wait for PDF to load first
  useEffect(() => {
    if (!jumpHighlight) return;
    // Wait for PDF to be loaded (numPages > 0) before attempting jump
    if (numPages === 0) {
      console.log('[usePdfJumpEffect] Highlight: Waiting for PDF to load');
      return;
    }

    const { pageNumber, rect } = jumpHighlight;
    console.log('[usePdfJumpEffect] Highlight effect triggered:', {
      pageNumber,
      rect,
    });

    let retryCount = 0;
    // Increase max retries to 100 (10 seconds) to handle slower PDF loading in new tabs
    const maxRetries = 100;
    let hasJumped = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const scrollPageIntoView = (
      pageEl: HTMLDivElement,
      block: 'start' | 'center' = 'start',
    ) => {
      const scrollContainer = viewerScrollRef?.current;

      if (scrollContainer) {
        // Use offsetTop for more reliable positioning
        const pageOffsetTop = pageEl.offsetTop;

        let targetScrollTop: number;
        if (block === 'start') {
          targetScrollTop = pageOffsetTop - 20;
        } else {
          const containerHeight = scrollContainer.clientHeight;
          targetScrollTop =
            pageOffsetTop - containerHeight / 2 + pageEl.offsetHeight / 2;
        }

        console.log('[usePdfJumpEffect] Highlight scroll executing:', {
          pageNumber,
          pageOffsetTop,
          targetScrollTop,
        });

        scrollContainer.scrollTo({
          top: Math.max(0, targetScrollTop),
          behavior: 'smooth',
        });
      } else {
        console.log(
          '[usePdfJumpEffect] Highlight: Using scrollIntoView fallback',
        );
        pageEl.scrollIntoView({ behavior: 'smooth', block });
      }
    };

    const attemptJump = () => {
      const pageEl = pageRefs.current[pageNumber];
      const scrollContainer = viewerScrollRef?.current;

      // Wait for both page element AND scroll container to be ready
      if (!scrollContainer) {
        console.log('[usePdfJumpEffect] Highlight: Scroll container not ready');
        return false;
      }

      if (!pageEl) {
        console.log(
          '[usePdfJumpEffect] Highlight: Page element not ready for page:',
          pageNumber,
        );
        return false;
      }

      if (hasJumped) {
        return true;
      }

      console.log('[usePdfJumpEffect] Highlight jump executing:', pageNumber);
      scrollPageIntoView(pageEl, 'center');
      hasJumped = true;
      return true;
    };

    // Delay first attempt to ensure DOM is ready after route change
    const initialDelay = setTimeout(() => {
      if (attemptJump()) {
        onAddTemporaryHighlight?.(pageNumber, rect);
        return;
      }

      console.log('[usePdfJumpEffect] Starting retry loop for highlight:', {
        pageNumber,
        rect,
      });
      intervalId = setInterval(() => {
        retryCount++;
        const success = attemptJump();
        if (success || retryCount >= maxRetries) {
          if (intervalId) clearInterval(intervalId);
          // Add highlight only if jump was successful
          if (success) {
            onAddTemporaryHighlight?.(pageNumber, rect);
          } else {
            console.log(
              '[usePdfJumpEffect] Max retries reached for highlight:',
              {
                pageNumber,
                rect,
                pageRefsAvailable: Object.keys(pageRefs.current),
              },
            );
          }
        }
      }, 100);
    }, 300); // Increase initial delay for new tab scenarios

    return () => {
      clearTimeout(initialDelay);
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [
    jumpHighlight,
    pageRefs,
    viewerScrollRef,
    numPages,
    onAddTemporaryHighlight,
  ]);
}
