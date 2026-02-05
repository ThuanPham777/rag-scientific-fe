// Core PDF state hook - manages basic PDF state
import { useState, useRef, useEffect } from 'react';

type PageIndex = {
  text: string;
  spans: { start: number; end: number; el: HTMLSpanElement }[];
};

export function usePdfState(fileUrl?: string) {
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Refs
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const viewerScrollRef = useRef<HTMLDivElement>(null);
  const pageIndexRef = useRef<Record<number, PageIndex>>({});

  // Reset when file changes
  useEffect(() => {
    setNumPages(0);
    setCurrentPage(1);
    setRotation(0);
    pageRefs.current = {};
    pageIndexRef.current = {};
  }, [fileUrl]);

  // Track current page based on scroll position
  useEffect(() => {
    const scrollEl = viewerScrollRef.current;
    if (!scrollEl || numPages === 0) return;

    const handleScroll = () => {
      const scrollTop = scrollEl.scrollTop;
      const scrollCenter = scrollTop + scrollEl.clientHeight / 2;

      let foundPage = 1;
      for (let p = 1; p <= numPages; p++) {
        const pageEl = pageRefs.current[p];
        if (pageEl) {
          const pageTop = pageEl.offsetTop;
          const pageBottom = pageTop + pageEl.offsetHeight;
          if (scrollCenter >= pageTop && scrollCenter < pageBottom) {
            foundPage = p;
            break;
          }
          if (scrollCenter < pageTop) break;
          foundPage = p;
        }
      }
      setCurrentPage(foundPage);
    };

    scrollEl.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => scrollEl.removeEventListener('scroll', handleScroll);
  }, [numPages]);

  // Page navigation
  const goToPage = (page: number) => {
    if (page < 1 || page > numPages) return;
    const pageEl = pageRefs.current[page];
    if (pageEl) {
      pageEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setCurrentPage(page);
  };

  // Rotation
  const rotateCw = () => setRotation((r) => (r + 90) % 360);
  const rotateCcw = () => setRotation((r) => (r - 90 + 360) % 360);

  return {
    // State
    numPages,
    setNumPages,
    currentPage,
    rotation,
    // Refs
    pageRefs,
    viewerScrollRef,
    pageIndexRef,
    // Actions
    goToPage,
    rotateCw,
    rotateCcw,
  };
}
