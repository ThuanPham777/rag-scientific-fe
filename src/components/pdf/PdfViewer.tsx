// src/components/pdf/PdfViewerRefactored.tsx
// Refactored PdfViewer with separated logic using custom hooks
import { useCallback, useState, useMemo, useEffect } from 'react';
import { Document, Page } from 'react-pdf';
import PdfToolbar from './PdfToolbar';
import PdfPages from './PdfPages';
import AuthModal from '../auth/AuthModal';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

import {
  usePdfState,
  usePdfZoom,
  usePdfFullscreen,
  usePdfSelectionActionMenu,
  usePdfHighlightsSync,
  usePdfSearch,
  usePdfCapture,
  usePdfJumpEffect,
  usePdfKeyboard,
} from '../../hooks/pdf';
import { useAuthStore } from '../../store/useAuthStore';

type HighlightRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

type JumpHighlight = {
  pageNumber: number;
  rect: HighlightRect;
};

type Props = {
  fileUrl?: string;
  paperId?: string;
  jumpToPage?: number;
  jumpHighlight?: JumpHighlight | null;
  onAction?: (
    action: 'explain' | 'summarize' | 'related' | 'highlight' | 'save',
    payload: {
      text: string;
      pageNumber: number;
      rects: HighlightRect[];
      imageDataUrl?: string;
    },
  ) => void;
  isChatDockOpen?: boolean;
  chatDockWidth?: number;
  onFullscreenChange?: (isFullscreen: boolean) => void;
};

export default function PdfViewer({
  fileUrl,
  paperId,
  jumpToPage: jumpToPageProp,
  jumpHighlight,
  onAction,
  isChatDockOpen = true,
  chatDockWidth = 450,
  onFullscreenChange,
}: Props) {
  // === Core state ===
  const pdfState = usePdfState(fileUrl);
  const {
    numPages,
    setNumPages,
    currentPage,
    rotation,
    pageRefs,
    viewerScrollRef,
    pageIndexRef,
    goToPage,
    rotateCw,
    rotateCcw,
  } = pdfState;

  // === Zoom ===
  const { scale, setScale, zoomIn, zoomOut } = usePdfZoom();

  // === Fullscreen ===
  const { isFullscreen, containerRef, toggleFullscreen } = usePdfFullscreen({
    onFullscreenChange,
  });

  // === Thumbnails ===
  const [showThumbnails, setShowThumbnails] = useState(false);

  // === Auth state ===
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // === Selection ===
  const { selection, clearSelection, scaleSelectionToCurrent } =
    usePdfSelectionActionMenu({
      pageRefs,
      viewerScrollRef,
      disabled: false,
    });

  // === Highlights (synced with server) ===
  const serverHighlights = usePdfHighlightsSync({
    paperId,
    pageRefs,
    enabled: !!paperId && isAuthenticated,
  });

  // === Temporary highlights (for jump/citation features - local state only) ===
  const [tempHighlights, setTempHighlights] = useState<
    Array<{
      id: string;
      pageNumber: number;
      rects: HighlightRect[];
      text: string;
      color?: string;
      isFading?: boolean; // For fade animation
    }>
  >([]);

  // Add temporary highlight (for jump/citation features)
  const addTemporaryHighlight = useCallback(
    (pageNumber: number, rect: HighlightRect) => {
      const tempId = `jump-${Date.now()}`;
      setTempHighlights((prev) => [
        ...prev.filter((h) => !h.id.startsWith('jump-')), // Remove old jump highlights
        {
          id: tempId,
          pageNumber,
          rects: [rect],
          text: '',
          color: '#ffc107', // Amber color for jump highlights
          isFading: false,
        },
      ]);

      // Start fade animation after 2 seconds
      setTimeout(() => {
        setTempHighlights((prev) =>
          prev.map((h) => (h.id === tempId ? { ...h, isFading: true } : h)),
        );
      }, 2000);

      // Remove after fade completes (3 seconds total)
      setTimeout(() => {
        setTempHighlights((prev) => prev.filter((h) => h.id !== tempId));
      }, 3000);
    },
    [],
  );

  // Use last color from local state
  const [lastColor, setLastColor] = useState<string | undefined>('#ffd700');

  // Merge server highlights with temporary highlights
  // Note: No local storage - highlights only exist on server or as temporary jump highlights
  const highlights = useMemo(() => {
    // Add isFading property to temp highlights for type compatibility
    const typedTempHighlights = tempHighlights.map((h) => ({
      ...h,
      isFading: h.isFading ?? false,
    }));

    // Server highlights are only available for authenticated users with paperId
    if (paperId && isAuthenticated && serverHighlights.highlights) {
      return [
        ...serverHighlights.highlights.map((h) => ({ ...h, isFading: false })),
        ...typedTempHighlights,
      ];
    }
    // For unauthenticated users or no paperId, only show temp highlights (for jump/citation)
    return typedTempHighlights;
  }, [paperId, isAuthenticated, serverHighlights.highlights, tempHighlights]);

  // === Search ===
  const search = usePdfSearch({
    pageRefs,
    pageIndexRef,
    viewerScrollRef,
    numPages,
    scale,
  });

  // === Capture ===
  const handleCapture = useCallback(
    (
      pageNumber: number,
      imageDataUrl: string,
      rect: { top: number; left: number; width: number; height: number },
    ) => {
      onAction?.('explain', {
        text: '',
        pageNumber,
        rects: [rect],
        imageDataUrl,
      });
    },
    [onAction],
  );

  const capture = usePdfCapture({
    pageRefs,
    onCapture: handleCapture,
  });

  // === Jump effects ===
  usePdfJumpEffect(jumpToPageProp, jumpHighlight, {
    pageRefs,
    viewerScrollRef,
    numPages,
    onAddTemporaryHighlight: addTemporaryHighlight,
  });

  // === Keyboard shortcuts ===
  usePdfKeyboard({
    onZoomIn: zoomIn,
    onZoomOut: zoomOut,
    onEscape: () => {
      clearSelection();
      capture.exitCapture();
    },
  });

  // === Action handlers ===
  // Track created highlight for subsequent updates
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(
    null,
  );

  // Reset activeHighlightId when selection changes (new text selected = new highlight)
  useEffect(() => {
    // When selection changes, we're dealing with a new highlight, not updating an existing one
    setActiveHighlightId(null);
  }, [selection?.text, selection?.pageNumber]);

  const handleAddHighlight = useCallback(
    async (color?: string, comment?: string, shouldClose = true) => {
      if (!selection) return;

      // Require authentication for highlighting
      if (!isAuthenticated) {
        setShowAuthModal(true);
        return;
      }

      // Require paperId for server storage
      if (!paperId) {
        console.warn('Cannot create highlight: paperId is missing');
        clearSelection();
        return;
      }

      const highlightColor = color || lastColor || '#ffd700';

      try {
        // If we already have an active highlight, update its color and add comment
        if (activeHighlightId) {
          // Update color
          await serverHighlights.updateHighlightColor(
            activeHighlightId,
            highlightColor,
          );

          // Add comment if provided
          if (comment && comment.trim()) {
            await serverHighlights.addComment(activeHighlightId, comment.trim());
          }

          // Update last used color
          if (color) {
            setLastColor(color);
          }
        } else {
          // Create new highlight
          const scaled = scaleSelectionToCurrent(selection);
          if (!scaled) return;

          const result = await serverHighlights.addHighlight(
            selection.pageNumber,
            selection.text,
            scaled.rects,
            highlightColor,
            comment,
          );

          // Store the created highlight ID for potential updates
          if (result?.id) {
            setActiveHighlightId(result.id);
          }

          // Update last used color
          if (color) {
            setLastColor(color);
          }

          onAction?.('highlight', {
            text: selection.text,
            pageNumber: selection.pageNumber,
            rects: scaled.rects,
          });
        }
      } catch (error) {
        console.error('Failed to save highlight to server:', error);
      }

      // Only clear selection if explicitly requested
      if (shouldClose) {
        setActiveHighlightId(null);
        clearSelection();
      }
    },
    [
      selection,
      scaleSelectionToCurrent,
      paperId,
      isAuthenticated,
      serverHighlights,
      lastColor,
      onAction,
      clearSelection,
      activeHighlightId,
    ],
  );

  // Handler to finalize highlight editing (close the editor)
  const handleFinalizeHighlight = useCallback(() => {
    setActiveHighlightId(null);
    clearSelection();
  }, [clearSelection]);

  const handleRemoveHighlight = useCallback(async () => {
    if (!selection) {
      clearSelection();
      return;
    }

    // Require authentication for highlight removal
    if (!isAuthenticated || !paperId) {
      clearSelection();
      return;
    }

    const scaled = scaleSelectionToCurrent(selection);
    if (scaled) {
      try {
        await serverHighlights.removeHighlightByRects(
          selection.pageNumber,
          scaled.rects,
        );
      } catch (error) {
        console.error('Failed to remove highlight from server:', error);
      }
    }
    clearSelection();
  }, [
    selection,
    scaleSelectionToCurrent,
    paperId,
    isAuthenticated,
    serverHighlights,
    clearSelection,
  ]);

  const fireAction = useCallback(
    (type: 'explain' | 'summarize' | 'related' | 'highlight' | 'save') => {
      if (!selection) return;
      const scaled = scaleSelectionToCurrent(selection);
      onAction?.(type, {
        text: selection.text,
        pageNumber: selection.pageNumber,
        rects: scaled?.rects || selection.rects,
      });
      clearSelection();
    },
    [selection, scaleSelectionToCurrent, onAction, clearSelection],
  );

  // === Download ===
  const handleDownload = useCallback(() => {
    if (!fileUrl) return;
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileUrl.split('/').pop() || 'document.pdf';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [fileUrl]);

  // === Styles ===
  const fullscreenStyle = isFullscreen
    ? isChatDockOpen
      ? { right: `${chatDockWidth}px` }
      : {}
    : {};

  // === Render ===
  return (
    <>
      {/* Fullscreen backdrop */}
      {isFullscreen && (
        <div className='fixed inset-0 z-[60] bg-gray-900/50 backdrop-blur-sm' />
      )}

      <div
        ref={containerRef}
        className={`flex flex-col min-h-0 transition-all duration-300 ${
          isFullscreen
            ? `fixed top-0 left-0 bottom-0 z-[70] bg-white ${isChatDockOpen ? '' : 'right-0'}`
            : 'h-full'
        }`}
        style={fullscreenStyle}
      >
        <PdfToolbar
          showSearch={search.showSearch}
          onToggleSearch={search.toggleSearch}
          query={search.query}
          onQueryChange={search.setQuery}
          hits={search.hits}
          hitIndex={search.hitIndex}
          onGotoHit={search.gotoHit}
          onRunSearch={search.runSearch}
          matchCase={search.matchCase}
          onMatchCaseChange={search.setMatchCase}
          wholeWords={search.wholeWords}
          onWholeWordsChange={search.setWholeWords}
          onToggleCapture={capture.toggleCapture}
          captureMode={capture.captureMode}
          zoomIn={zoomIn}
          zoomOut={zoomOut}
          scale={scale}
          setScale={setScale}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          onRotateCw={rotateCw}
          onRotateCcw={rotateCcw}
          onDownload={handleDownload}
          fileUrl={fileUrl}
          currentPage={currentPage}
          numPages={numPages}
          onPageChange={goToPage}
          onToggleThumbnails={() => setShowThumbnails((v) => !v)}
          showThumbnails={showThumbnails}
        />

        <div className='flex-1 flex min-h-0'>
          {/* Thumbnails sidebar */}
          {isFullscreen && showThumbnails && numPages > 0 && fileUrl && (
            <div className='w-44 border-r border-gray-200 bg-gray-100 overflow-y-auto flex-shrink-0'>
              <div className='p-2 space-y-2'>
                <Document file={fileUrl}>
                  {Array.from({ length: numPages }, (_, idx) => {
                    const pageNum = idx + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => goToPage(pageNum)}
                        className={`w-full p-2 rounded-lg border transition-all ${
                          currentPage === pageNum
                            ? 'border-orange-500 bg-orange-50 shadow-sm'
                            : 'border-gray-300 bg-white hover:border-orange-300 hover:bg-orange-50/50'
                        }`}
                      >
                        <div className='overflow-hidden rounded mb-1 bg-white shadow-sm'>
                          <Page
                            pageNumber={pageNum}
                            width={120}
                            renderTextLayer={false}
                            renderAnnotationLayer={false}
                          />
                        </div>
                        <div className='text-xs text-center text-gray-600'>
                          {pageNum}
                        </div>
                      </button>
                    );
                  })}
                </Document>
              </div>
            </div>
          )}

          {/* Main PDF content */}
          <div
            ref={viewerScrollRef}
            className={`flex-1 overflow-auto bg-gray-50 min-h-0 relative ${
              capture.captureMode ? 'cursor-crosshair' : ''
            }`}
          >
            <style>{`
              /* Remove font-weight change that causes rendering issues */
              .textLayer {
                /* Ensure text layer is above highlight layer */
                z-index: 2 !important;
              }
              .textLayer span {
                /* Prevent font rendering issues */
                -webkit-font-smoothing: antialiased;
              }
              .textLayer ::selection {
                background-color: rgba(59, 130, 246, 0.3);
              }
              .pdf-pages-container {
                display: flex;
                flex-direction: column;
                align-items: center;
              }
            `}</style>

            {!fileUrl ? (
              <div className='p-6 text-sm text-gray-500'>No PDF selected.</div>
            ) : (
              <PdfPages
                fileUrl={fileUrl}
                numPages={numPages}
                scale={scale}
                rotation={rotation}
                highlights={highlights}
                selection={selection}
                captureMode={capture.captureMode}
                dragBox={capture.dragBox}
                pageRefs={pageRefs}
                onPageRender={search.onPageRender}
                onStartDrag={capture.onStartDrag}
                onMoveDrag={capture.onMoveDrag}
                onEndDrag={capture.onEndDrag}
                onAction={fireAction}
                onAddHighlight={handleAddHighlight}
                onRemoveHighlight={handleRemoveHighlight}
                onFinalizeHighlight={handleFinalizeHighlight}
                selectedColorDefault={lastColor}
                onSelectedColorChange={setLastColor}
                onLoadSuccess={setNumPages}
                isAuthenticated={isAuthenticated}
                paperId={paperId}
              />
            )}
          </div>
        </div>
      </div>

      {/* Auth Modal for unauthenticated highlight attempts */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode='login'
      />
    </>
  );
}
