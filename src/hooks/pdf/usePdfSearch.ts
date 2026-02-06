// Search hook - manages PDF text search functionality
import { useState, useEffect, useCallback, useRef } from 'react';

export type HighlightRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

type PageIndex = {
  text: string;
  spans: { start: number; end: number; el: HTMLSpanElement }[];
};

// Individual match info for navigation
type SearchMatch = {
  pageNumber: number;
  rect: HighlightRect;
  matchIndex: number; // index within all matches
};

export interface UseSearchOptions {
  pageRefs: React.MutableRefObject<Record<number, HTMLDivElement | null>>;
  pageIndexRef: React.MutableRefObject<Record<number, PageIndex>>;
  viewerScrollRef: React.RefObject<HTMLDivElement | null>;
  numPages: number;
  scale: number;
}

export function usePdfSearch(options: UseSearchOptions) {
  const { pageRefs, pageIndexRef, viewerScrollRef, numPages, scale } = options;

  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [wholeWords, setWholeWords] = useState(false);
  const [hits, setHits] = useState<
    { pageNumber: number; rects: HighlightRect[] }[]
  >([]);
  const [hitIndex, setHitIndex] = useState(0);

  // Track all individual matches for navigation
  const matchesRef = useRef<SearchMatch[]>([]);
  // Track pending pages that need re-indexing after text layer renders
  const pendingPagesRef = useRef<Set<number>>(new Set());
  // Track if search is pending (waiting for text layers)
  const searchPendingRef = useRef(false);
  // Track observers for cleanup
  const observersRef = useRef<Map<number, MutationObserver>>(new Map());

  const buildRegex = useCallback(() => {
    if (!query.trim()) return null;
    const esc = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = wholeWords ? `\\b${esc}\\b` : esc;
    return new RegExp(pattern, matchCase ? 'g' : 'gi');
  }, [query, matchCase, wholeWords]);

  const clearSearchOverlays = useCallback(
    (pageNumber: number) => {
      const pageEl = pageRefs.current[pageNumber];
      if (!pageEl) return;
      pageEl.querySelectorAll('.pdf-search-hit').forEach((el) => el.remove());
      pageEl
        .querySelectorAll('.pdf-search-hit-current')
        .forEach((el) => el.remove());
    },
    [pageRefs],
  );

  // Create overlay for a range with option for current match styling
  const overlayForRange = useCallback(
    (
      range: Range,
      pageEl: HTMLElement,
      isCurrent: boolean = false,
    ): HighlightRect[] => {
      const textLayer =
        (pageEl.querySelector('.textLayer') as HTMLElement | null) || pageEl;
      const pageBox = textLayer.getBoundingClientRect();
      const rects = Array.from(range.getClientRects()).map((r) => ({
        top: r.top - pageBox.top,
        left: r.left - pageBox.left,
        width: r.width,
        height: r.height,
      }));

      rects.forEach((r) => {
        const div = document.createElement('div');
        div.className = isCurrent
          ? 'pdf-search-hit-current absolute rounded-[2px] pointer-events-none'
          : 'pdf-search-hit absolute rounded-[2px] pointer-events-none';
        Object.assign(div.style, {
          top: `${r.top}px`,
          left: `${r.left}px`,
          width: `${r.width}px`,
          height: `${r.height}px`,
          backgroundColor: isCurrent
            ? 'rgba(249, 115, 22, 0.6)'
            : 'rgba(253, 224, 71, 0.5)', // orange-500 vs yellow-300
          zIndex: isCurrent ? '20' : '10',
          boxShadow: isCurrent ? '0 0 4px rgba(249, 115, 22, 0.8)' : 'none',
        });
        textLayer.appendChild(div);
      });

      return rects;
    },
    [],
  );

  const clearAllSearchHighlights = useCallback(() => {
    for (let p = 1; p <= numPages; p++) clearSearchOverlays(p);
    setHits([]);
    setHitIndex(0);
    matchesRef.current = [];
  }, [numPages, clearSearchOverlays]);

  // Update current match highlight (change which match is marked as current)
  const updateCurrentMatchHighlight = useCallback(
    (newIndex: number) => {
      const matches = matchesRef.current;
      if (!matches.length) return;

      // Remove all current match highlights
      for (let p = 1; p <= numPages; p++) {
        const pageEl = pageRefs.current[p];
        if (!pageEl) continue;
        pageEl
          .querySelectorAll('.pdf-search-hit-current')
          .forEach((el) => el.remove());
      }

      // Create current match highlight for the new index
      const currentMatch = matches[newIndex];
      if (!currentMatch) return;

      const pageEl = pageRefs.current[currentMatch.pageNumber];
      const idx = pageIndexRef.current[currentMatch.pageNumber];
      if (!pageEl || !idx) return;

      // Re-find the match to get the range
      const re = buildRegex();
      if (!re) return;

      const { text, spans } = idx;
      let matchCounter = 0;
      let m: RegExpExecArray | null;

      // Reset regex state
      re.lastIndex = 0;

      while ((m = re.exec(text))) {
        // Find the absolute match index for this page
        let absoluteIndex = 0;
        for (const hit of hits) {
          if (hit.pageNumber < currentMatch.pageNumber) {
            absoluteIndex += hit.rects.length;
          } else {
            break;
          }
        }

        if (absoluteIndex + matchCounter === newIndex) {
          const start = m.index;
          const end = start + m[0].length;

          const spanStart = spans.find(
            (s) => start >= s.start && start < s.end,
          );
          const spanEnd =
            spans.find((s) => end > s.start && end <= s.end) ||
            spans[spans.length - 1];

          if (spanStart && spanEnd) {
            try {
              const r = document.createRange();
              r.setStart(
                spanStart.el.firstChild || spanStart.el,
                Math.min(
                  start - spanStart.start,
                  spanStart.el.textContent?.length || 0,
                ),
              );
              r.setEnd(
                spanEnd.el.firstChild || spanEnd.el,
                Math.min(
                  end - spanEnd.start,
                  spanEnd.el.textContent?.length || 0,
                ),
              );
              overlayForRange(r, pageEl, true);
            } catch {
              // Range creation failed, skip
            }
          }
          break;
        }
        matchCounter++;
      }
    },
    [numPages, pageRefs, pageIndexRef, buildRegex, hits, overlayForRange],
  );

  const runSearch = useCallback(() => {
    if (!query.trim()) {
      clearAllSearchHighlights();
      searchPendingRef.current = false;
      return;
    }

    const re = buildRegex();
    if (!re) return;

    const allHits: { pageNumber: number; rects: HighlightRect[] }[] = [];
    const allMatches: SearchMatch[] = [];
    let globalMatchIndex = 0;
    let pagesWithoutIndex = 0;

    for (let p = 1; p <= numPages; p++) {
      clearSearchOverlays(p);
      const idx = pageIndexRef.current[p];
      const pageEl = pageRefs.current[p];

      // If page doesn't have index yet, track it
      if (!idx || !pageEl) {
        pagesWithoutIndex++;
        continue;
      }

      const { text, spans } = idx;
      if (!text || !spans.length) {
        pagesWithoutIndex++;
        continue;
      }

      const rectsPage: HighlightRect[] = [];

      // Reset regex for each page
      re.lastIndex = 0;

      let m: RegExpExecArray | null;
      while ((m = re.exec(text))) {
        const start = m.index;
        const end = start + m[0].length;

        const spanStart = spans.find((s) => start >= s.start && start < s.end);
        const spanEnd =
          spans.find((s) => end > s.start && end <= s.end) ||
          spans[spans.length - 1];

        if (!spanStart || !spanEnd) continue;

        try {
          const r = document.createRange();
          const startOffset = Math.min(
            start - spanStart.start,
            spanStart.el.textContent?.length || 0,
          );
          const endOffset = Math.min(
            end - spanEnd.start,
            spanEnd.el.textContent?.length || 0,
          );

          r.setStart(spanStart.el.firstChild || spanStart.el, startOffset);
          r.setEnd(spanEnd.el.firstChild || spanEnd.el, endOffset);

          // First match gets current styling
          const isFirst = globalMatchIndex === 0;
          const rs = overlayForRange(r, pageEl, isFirst);

          rs.forEach((rect) => {
            rectsPage.push(rect);
            allMatches.push({
              pageNumber: p,
              rect,
              matchIndex: globalMatchIndex,
            });
            globalMatchIndex++;
          });
        } catch {
          // Skip this match if range creation fails
          continue;
        }
      }

      if (rectsPage.length) allHits.push({ pageNumber: p, rects: rectsPage });
    }

    matchesRef.current = allMatches;
    setHits(allHits);
    setHitIndex(0);

    // If there are pages without index, search is pending
    searchPendingRef.current = pagesWithoutIndex > 0 && numPages > 0;

    // Scroll to first match
    if (allMatches.length > 0) {
      const first = allMatches[0];
      const pageEl = pageRefs.current[first.pageNumber];
      if (pageEl) {
        pageEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    }
  }, [
    query,
    numPages,
    buildRegex,
    clearSearchOverlays,
    clearAllSearchHighlights,
    overlayForRange,
    pageRefs,
    pageIndexRef,
  ]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(runSearch, 200);
    return () => clearTimeout(t);
  }, [query, matchCase, wholeWords, numPages]);

  // Re-run search when scale changes (UI update only, don't reset index)
  useEffect(() => {
    if (query.trim() && hits.length > 0) {
      // Delay to allow re-render
      const t = setTimeout(() => {
        runSearch();
      }, 100);
      return () => clearTimeout(t);
    }
  }, [scale]);

  const gotoHit = useCallback(
    (dir: 1 | -1) => {
      const matches = matchesRef.current;
      if (!matches.length) return;

      const total = matches.length;
      const next = (hitIndex + dir + total) % total;
      setHitIndex(next);

      // Update current match highlighting
      updateCurrentMatchHighlight(next);

      // Scroll to the match
      const match = matches[next];
      if (match) {
        const pageEl = pageRefs.current[match.pageNumber];
        if (pageEl) {
          // First scroll to page
          pageEl.scrollIntoView({ block: 'center', behavior: 'smooth' });

          // Then adjust for the specific match position
          setTimeout(() => {
            const textLayer = pageEl.querySelector('.textLayer');
            if (textLayer && viewerScrollRef.current) {
              const textLayerRect = textLayer.getBoundingClientRect();
              const containerRect =
                viewerScrollRef.current.getBoundingClientRect();
              const matchTop = textLayerRect.top + match.rect.top;
              const targetScroll =
                matchTop - containerRect.top - containerRect.height / 3;

              viewerScrollRef.current.scrollBy({
                top: targetScroll,
                behavior: 'smooth',
              });
            }
          }, 100);
        }
      }
    },
    [hitIndex, pageRefs, viewerScrollRef, updateCurrentMatchHighlight],
  );

  const toggleSearch = useCallback(() => {
    setShowSearch((v) => {
      const next = !v;
      if (v && !next) {
        setQuery('');
        clearAllSearchHighlights();
      }
      return next;
    });
  }, [clearAllSearchHighlights]);

  // Index page text on render - with robust text layer detection
  const onPageRender = useCallback(
    (pageNumber: number) => {
      const pageEl = pageRefs.current[pageNumber];
      if (!pageEl) return;

      // Clean up existing observer for this page
      const existingObserver = observersRef.current.get(pageNumber);
      if (existingObserver) {
        existingObserver.disconnect();
        observersRef.current.delete(pageNumber);
      }

      const indexTextLayer = () => {
        const textLayer = pageEl.querySelector(
          '.textLayer',
        ) as HTMLElement | null;
        if (!textLayer) return false;

        const spans = Array.from(
          textLayer.querySelectorAll('span'),
        ) as HTMLSpanElement[];

        // Need at least some spans to index
        if (spans.length === 0) return false;

        let text = '';
        let cursor = 0;
        const entries: PageIndex['spans'] = [];

        spans.forEach((s) => {
          const t = s.textContent ?? '';
          if (t.length > 0) {
            const start = cursor;
            const end = cursor + t.length;
            cursor = end;
            text += t;
            entries.push({ start, end, el: s });
          }
        });

        // Only index if we have actual text
        if (text.length > 0 && entries.length > 0) {
          pageIndexRef.current[pageNumber] = { text, spans: entries };

          // If search is pending, re-run search
          if (searchPendingRef.current && query.trim()) {
            pendingPagesRef.current.delete(pageNumber);
            // Debounce the re-search
            setTimeout(() => {
              if (searchPendingRef.current) {
                runSearch();
              }
            }, 50);
          }
          return true;
        }
        return false;
      };

      // Try to index immediately
      if (indexTextLayer()) return;

      // If text layer not ready, use MutationObserver to wait for it
      const observer = new MutationObserver(() => {
        if (indexTextLayer()) {
          observer.disconnect();
          observersRef.current.delete(pageNumber);
        }
      });

      observer.observe(pageEl, {
        childList: true,
        subtree: true,
        characterData: true,
      });

      observersRef.current.set(pageNumber, observer);
      pendingPagesRef.current.add(pageNumber);

      // Fallback timeout - try again after a delay
      setTimeout(() => {
        if (!pageIndexRef.current[pageNumber]) {
          indexTextLayer();
        }
      }, 500);
    },
    [pageRefs, pageIndexRef, query, runSearch],
  );

  // Cleanup observers on unmount
  useEffect(() => {
    return () => {
      observersRef.current.forEach((observer) => observer.disconnect());
      observersRef.current.clear();
    };
  }, []);

  // Reset search when numPages changes (new document loaded)
  useEffect(() => {
    if (numPages === 0) {
      clearAllSearchHighlights();
      pageIndexRef.current = {};
      searchPendingRef.current = false;
      pendingPagesRef.current.clear();
    }
  }, [numPages, clearAllSearchHighlights, pageIndexRef]);

  // Calculate total matches for display
  const totalMatches = matchesRef.current.length;

  return {
    showSearch,
    query,
    setQuery,
    matchCase,
    setMatchCase,
    wholeWords,
    setWholeWords,
    hits,
    hitIndex,
    totalMatches,
    toggleSearch,
    runSearch,
    gotoHit,
    clearAllSearchHighlights,
    onPageRender,
  };
}
