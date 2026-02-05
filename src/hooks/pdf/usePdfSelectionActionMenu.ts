// Selection hook - manages text selection in PDF
import { useState, useEffect, useRef, useCallback } from 'react';

export type HighlightRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

export type Selection = {
  pageNumber: number;
  text: string;
  rects: HighlightRect[];
  anchor: { x: number; y: number };
  pageClientWidth?: number;
  pageClientHeight?: number;
} | null;

export interface UseSelectionOptions {
  pageRefs: React.MutableRefObject<Record<number, HTMLDivElement | null>>;
  viewerScrollRef: React.RefObject<HTMLDivElement | null>;
  disabled?: boolean;
}

export function usePdfSelectionActionMenu(options: UseSelectionOptions) {
  const { pageRefs, viewerScrollRef, disabled = false } = options;
  const [selection, setSelection] = useState<Selection>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  // Handle text selection
  useEffect(() => {
    const handleMouseUp = () => {
      if (disabled) return;

      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) {
        setSelection(null);
        return;
      }

      const text = sel.toString().trim();
      if (!text) {
        setSelection(null);
        return;
      }

      const anchorNode = sel.anchorNode as Node | null;
      const pageEl = (
        anchorNode instanceof HTMLElement
          ? anchorNode
          : (anchorNode?.parentElement as HTMLElement)
      )?.closest('[data-page]') as HTMLElement | null;

      if (!pageEl) return;

      const textLayer =
        (pageEl.querySelector('.textLayer') as HTMLElement | null) || pageEl;

      const pageNumber = Number(pageEl.getAttribute('data-page') || 1);
      const pageBounds = textLayer.getBoundingClientRect();
      const range = sel.getRangeAt(0);
      const rectsDom = Array.from(range.getClientRects());

      const rects: HighlightRect[] = rectsDom.map((r) => ({
        top: r.top - pageBounds.top,
        left: r.left - pageBounds.left,
        width: r.width,
        height: r.height,
      }));

      if (!rects.length) {
        setSelection(null);
        return;
      }

      const first = rects[0];
      const anchor = { x: first.left + first.width + 12, y: first.top };

      setSelection({
        pageNumber,
        text,
        rects,
        anchor,
        pageClientWidth: textLayer.clientWidth,
        pageClientHeight: textLayer.clientHeight,
      });
    };

    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, [disabled]);

  // Hide selection on scroll
  useEffect(() => {
    const el = viewerScrollRef.current;
    if (!el) return;
    const handleScroll = () => setSelection(null);
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [viewerScrollRef]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Check if click is inside any popup (SelectionPopup, ColorPopup, or HighlightPopup)
      const isInsidePopup =
        target.closest('[data-selection-popup="true"]') ||
        target.closest('[data-color-popup="true"]') ||
        target.closest('[data-highlight-popup="true"]') ||
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA';

      if (isInsidePopup) {
        return; // Don't close if clicking inside popup or form elements
      }

      if (popupRef.current && popupRef.current.contains(target)) {
        return; // Don't close if clicking inside the local popup ref
      }

      setSelection(null);
      window.getSelection()?.removeAllRanges?.();
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const clearSelection = useCallback(() => {
    setSelection(null);
    window.getSelection()?.removeAllRanges?.();
  }, []);

  // Scale selection to current viewport
  const scaleSelectionToCurrent = useCallback(
    (sel: Selection) => {
      if (!sel) return sel;
      const pageEl = pageRefs.current[sel.pageNumber];
      if (!pageEl) return sel;

      const textLayer =
        (pageEl.querySelector('.textLayer') as HTMLElement | null) || pageEl;
      const baseW = sel.pageClientWidth || textLayer.clientWidth;
      const baseH = sel.pageClientHeight || textLayer.clientHeight;
      const fx = textLayer.clientWidth / baseW;
      const fy = textLayer.clientHeight / baseH;

      const rects = sel.rects.map((r) => ({
        top: r.top * fy,
        left: r.left * fx,
        width: r.width * fx,
        height: r.height * fy,
      }));
      const anchor = { x: sel.anchor.x * fx, y: sel.anchor.y * fy };
      return { ...sel, rects, anchor } as Selection;
    },
    [pageRefs],
  );

  return {
    selection,
    setSelection,
    clearSelection,
    popupRef,
    scaleSelectionToCurrent,
  };
}
