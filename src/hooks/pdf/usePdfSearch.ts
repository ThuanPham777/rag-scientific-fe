// Search hook - manages PDF text search functionality
// Supports English & Vietnamese with proper Unicode normalization
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
  /** Character offset in the page's concatenated text */
  startOffset: number;
  endOffset: number;
  matchIndex: number; // global index across all pages
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Normalize a string to NFC and optionally lowercase */
function normText(s: string, lower: boolean): string {
  const n = s.normalize('NFC');
  return lower ? n.toLowerCase() : n;
}

/**
 * Build a Unicode-aware search regex.
 *
 * JavaScript's `\b` only recognizes ASCII word chars ([a-zA-Z0-9_]).
 * For Vietnamese / accented text we use `\p{L}` / `\p{N}` (Unicode
 * letter / digit) with lookahead / lookbehind to define word boundaries.
 */
function buildSearchRegex(
  query: string,
  matchCase: boolean,
  wholeWords: boolean,
): RegExp | null {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  let pattern: string;
  if (wholeWords) {
    // Unicode-aware word boundaries
    pattern = `(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`;
  } else {
    pattern = escaped;
  }

  let flags = 'gu'; // global + unicode
  if (!matchCase) flags += 'i';

  try {
    return new RegExp(pattern, flags);
  } catch {
    // Fallback for environments without Unicode property escapes
    const fbPattern = wholeWords ? `\\b${escaped}\\b` : escaped;
    return new RegExp(fbPattern, matchCase ? 'g' : 'gi');
  }
}

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
  // Merges adjacent client rects on the same line to avoid fragmented highlights
  const overlayForRange = useCallback(
    (
      range: Range,
      pageEl: HTMLElement,
      isCurrent: boolean = false,
    ): HighlightRect[] => {
      const textLayer =
        (pageEl.querySelector('.textLayer') as HTMLElement | null) || pageEl;
      const pageBox = textLayer.getBoundingClientRect();

      const rawRects = Array.from(range.getClientRects());
      const merged: HighlightRect[] = [];

      for (const cr of rawRects) {
        const r: HighlightRect = {
          top: cr.top - pageBox.top,
          left: cr.left - pageBox.left,
          width: cr.width,
          height: cr.height,
        };
        // Skip zero-dimension rects
        if (r.width < 0.5 || r.height < 0.5) continue;

        // Merge with last rect if same line and adjacent
        const last = merged[merged.length - 1];
        if (
          last &&
          Math.abs(last.top - r.top) < 2 &&
          Math.abs(last.height - r.height) < 2 &&
          Math.abs(last.left + last.width - r.left) < 3
        ) {
          last.width = r.left + r.width - last.left;
        } else {
          merged.push(r);
        }
      }

      for (const r of merged) {
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
      }

      return merged;
    },
    [],
  );

  const clearAllSearchHighlights = useCallback(() => {
    for (let p = 1; p <= numPages; p++) clearSearchOverlays(p);
    setHits([]);
    setHitIndex(0);
    matchesRef.current = [];
  }, [numPages, clearSearchOverlays]);

  // ---- Helper: create a DOM Range given a page & character offsets ----
  const createRangeForMatch = useCallback(
    (
      pageNumber: number,
      startOffset: number,
      endOffset: number,
    ): Range | null => {
      const idx = pageIndexRef.current[pageNumber];
      if (!idx) return null;

      const { spans } = idx;
      const spanStart = spans.find(
        (s) => startOffset >= s.start && startOffset < s.end,
      );
      const spanEnd =
        spans.find((s) => endOffset > s.start && endOffset <= s.end) ||
        spans[spans.length - 1];

      if (!spanStart || !spanEnd) return null;

      try {
        const range = document.createRange();
        const sNode = spanStart.el.firstChild || spanStart.el;
        const eNode = spanEnd.el.firstChild || spanEnd.el;
        const sOff = Math.min(
          startOffset - spanStart.start,
          (sNode.textContent ?? '').length,
        );
        const eOff = Math.min(
          endOffset - spanEnd.start,
          (eNode.textContent ?? '').length,
        );
        range.setStart(sNode, sOff);
        range.setEnd(eNode, eOff);
        return range;
      } catch {
        return null;
      }
    },
    [pageIndexRef],
  );

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
      if (!pageEl) return;

      const range = createRangeForMatch(
        currentMatch.pageNumber,
        currentMatch.startOffset,
        currentMatch.endOffset,
      );
      if (range) {
        overlayForRange(range, pageEl, true);
      }
    },
    [numPages, pageRefs, createRangeForMatch, overlayForRange],
  );

  const runSearch = useCallback(() => {
    if (!query.trim()) {
      clearAllSearchHighlights();
      searchPendingRef.current = false;
      return;
    }

    // Normalize query: NFC + lowercase when case-insensitive
    const isLower = !matchCase;
    const normalizedQuery = normText(query, isLower);
    // Build regex on the normalized query (always case-sensitive since we pre-lowered)
    const re = buildSearchRegex(normalizedQuery, true, wholeWords);
    if (!re) return;

    const allHits: { pageNumber: number; rects: HighlightRect[] }[] = [];
    const allMatches: SearchMatch[] = [];
    let globalMatchIndex = 0;
    let pagesWithoutIndex = 0;

    for (let p = 1; p <= numPages; p++) {
      clearSearchOverlays(p);
      const idx = pageIndexRef.current[p];
      const pageEl = pageRefs.current[p];

      if (!idx || !pageEl) {
        pagesWithoutIndex++;
        continue;
      }

      const { text, spans } = idx;
      if (!text || !spans.length) {
        pagesWithoutIndex++;
        continue;
      }

      // Normalize the page text the same way as the query
      const searchText = isLower ? normText(text, true) : text.normalize('NFC');

      const rectsPage: HighlightRect[] = [];

      re.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(searchText))) {
        const start = m.index;
        const end = start + m[0].length;

        const range = createRangeForMatch(p, start, end);
        if (!range) continue;

        // First match gets current styling
        const isFirst = globalMatchIndex === 0;
        const rs = overlayForRange(range, pageEl, isFirst);

        if (rs.length) {
          rectsPage.push(...rs);
          allMatches.push({
            pageNumber: p,
            startOffset: start,
            endOffset: end,
            matchIndex: globalMatchIndex,
          });
          globalMatchIndex++;
        }
      }

      if (rectsPage.length) allHits.push({ pageNumber: p, rects: rectsPage });
    }

    matchesRef.current = allMatches;
    setHits(allHits);
    setHitIndex(0);

    searchPendingRef.current = pagesWithoutIndex > 0 && numPages > 0;

    // Scroll to first match using single direct scroll
    if (allMatches.length > 0) {
      const first = allMatches[0];
      scrollToMatch(first);
    }
  }, [
    query,
    matchCase,
    wholeWords,
    numPages,
    clearSearchOverlays,
    clearAllSearchHighlights,
    overlayForRange,
    createRangeForMatch,
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

  // Scroll to a specific match — single direct scroll, no double-jump
  const scrollToMatch = useCallback(
    (match: SearchMatch) => {
      const pageEl = pageRefs.current[match.pageNumber];
      if (!pageEl) return;

      const range = createRangeForMatch(
        match.pageNumber,
        match.startOffset,
        match.endOffset,
      );

      const scrollContainer = viewerScrollRef?.current;
      if (!range || !scrollContainer) {
        // Fallback: scroll page into view
        pageEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
        return;
      }

      // Calculate match position relative to scroll container
      const rangeRect = range.getBoundingClientRect();
      const containerRect = scrollContainer.getBoundingClientRect();
      const matchAbsoluteTop =
        rangeRect.top - containerRect.top + scrollContainer.scrollTop;
      const matchCenter = matchAbsoluteTop + rangeRect.height / 2;
      const targetScrollTop = matchCenter - containerRect.height / 3;

      scrollContainer.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: 'smooth',
      });
    },
    [pageRefs, viewerScrollRef, createRangeForMatch],
  );

  const gotoHit = useCallback(
    (dir: 1 | -1) => {
      const matches = matchesRef.current;
      if (!matches.length) return;

      const total = matches.length;
      const next = (hitIndex + dir + total) % total;
      setHitIndex(next);

      // Update current match highlighting
      updateCurrentMatchHighlight(next);

      // Scroll to the match with single smooth scroll
      scrollToMatch(matches[next]);
    },
    [hitIndex, updateCurrentMatchHighlight, scrollToMatch],
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
          const raw = s.textContent ?? '';
          if (raw.length > 0) {
            // NFC normalize for consistent Vietnamese diacritics
            const t = raw.normalize('NFC');
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
