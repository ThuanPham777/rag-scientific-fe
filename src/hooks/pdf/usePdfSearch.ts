// Search hook - manages PDF text search functionality
import { useState, useEffect, useCallback } from 'react';

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
    },
    [pageRefs],
  );

  const overlayForRange = useCallback((range: Range, pageEl: HTMLElement) => {
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
      div.className =
        'pdf-search-hit absolute bg-yellow-300/40 rounded-[2px] pointer-events-none';
      Object.assign(div.style, {
        top: `${r.top}px`,
        left: `${r.left}px`,
        width: `${r.width}px`,
        height: `${r.height}px`,
      });
      textLayer.appendChild(div);
    });

    return rects;
  }, []);

  const clearAllSearchHighlights = useCallback(() => {
    for (let p = 1; p <= numPages; p++) clearSearchOverlays(p);
    setHits([]);
    setHitIndex(0);
  }, [numPages, clearSearchOverlays]);

  const runSearch = useCallback(() => {
    if (!query.trim()) {
      clearAllSearchHighlights();
      return;
    }

    const re = buildRegex();
    if (!re) return;

    const allHits: { pageNumber: number; rects: HighlightRect[] }[] = [];

    for (let p = 1; p <= numPages; p++) {
      clearSearchOverlays(p);
      const idx = pageIndexRef.current[p];
      const pageEl = pageRefs.current[p];
      if (!idx || !pageEl) continue;

      const { text, spans } = idx;
      const rectsPage: HighlightRect[] = [];

      let m: RegExpExecArray | null;
      while ((m = re.exec(text))) {
        const start = m.index;
        const end = start + m[0].length;

        const spanStart = spans.find((s) => start >= s.start && start < s.end);
        const spanEnd =
          spans.find((s) => end > s.start && end <= s.end) ||
          spans[spans.length - 1];
        if (!spanStart || !spanEnd) continue;

        const r = document.createRange();
        r.setStart(
          spanStart.el.firstChild || spanStart.el,
          start - spanStart.start,
        );
        r.setEnd(spanEnd.el.firstChild || spanEnd.el, end - spanEnd.start);

        const rs = overlayForRange(r, pageEl);
        rectsPage.push(...rs);
      }

      if (rectsPage.length) allHits.push({ pageNumber: p, rects: rectsPage });
    }

    setHits(allHits);
    setHitIndex(0);

    if (allHits.length) {
      const first = allHits[0].rects[0];
      pageRefs.current[allHits[0].pageNumber]?.scrollIntoView({
        block: 'center',
      });
      viewerScrollRef.current?.scrollBy({
        top: Math.max(0, first.top - 80),
        behavior: 'smooth',
      });
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
    viewerScrollRef,
  ]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(runSearch, 140);
    return () => clearTimeout(t);
  }, [query, matchCase, wholeWords, numPages, scale]);

  const gotoHit = useCallback(
    (dir: 1 | -1) => {
      if (!hits.length) return;
      const total = hits.reduce((s, h) => s + h.rects.length, 0);
      const next = (hitIndex + (dir === 1 ? 1 : total - 1)) % total;
      setHitIndex(next);

      let k = 0;
      for (const h of hits) {
        for (const r of h.rects) {
          if (k === next) {
            pageRefs.current[h.pageNumber]?.scrollIntoView({ block: 'center' });
            viewerScrollRef.current?.scrollBy({
              top: Math.max(0, r.top - 80),
              behavior: 'smooth',
            });
            return;
          }
          k++;
        }
      }
    },
    [hits, hitIndex, pageRefs, viewerScrollRef],
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

  // Index page text on render
  const onPageRender = useCallback(
    (pageNumber: number) => {
      const pageEl = pageRefs.current[pageNumber];
      if (!pageEl) return;

      const textLayer = pageEl.querySelector(
        '.textLayer',
      ) as HTMLElement | null;
      if (!textLayer) {
        setTimeout(() => onPageRender(pageNumber), 60);
        return;
      }

      const spans = Array.from(
        textLayer.querySelectorAll('span'),
      ) as HTMLSpanElement[];
      let text = '';
      let cursor = 0;
      const entries: PageIndex['spans'] = [];

      spans.forEach((s) => {
        const t = s.textContent ?? '';
        const start = cursor;
        const end = cursor + t.length;
        cursor = end;
        text += t;
        entries.push({ start, end, el: s });
      });

      pageIndexRef.current[pageNumber] = { text, spans: entries };
    },
    [pageRefs, pageIndexRef],
  );

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
    toggleSearch,
    runSearch,
    gotoHit,
    clearAllSearchHighlights,
    onPageRender,
  };
}
