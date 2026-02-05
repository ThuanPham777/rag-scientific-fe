// src/components/pdf/PdfViewerRefactored.tsx
// Refactored PdfViewer with separated logic using custom hooks
import { useCallback, useState } from 'react';
import { Document, Page } from 'react-pdf';
import PdfToolbar from './PdfToolbar';
import PdfPages from './PdfPages';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

import {
  usePdfState,
  usePdfZoom,
  usePdfFullscreen,
  usePdfSelection,
  usePdfHighlights,
  usePdfSearch,
  usePdfCapture,
  usePdfJumpEffect,
  usePdfKeyboard,
} from '../../hooks/pdf';

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

  // === Selection ===
  const { selection, clearSelection, scaleSelectionToCurrent } =
    usePdfSelection({
      pageRefs,
      viewerScrollRef,
      disabled: false,
    });

  // === Highlights ===
  const {
    highlights,
    lastColor,
    setLastColor,
    addHighlight: addHighlightToStore,
    removeHighlight,
    addTemporaryHighlight,
  } = usePdfHighlights({ pageRefs });

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
  const handleAddHighlight = useCallback(
    (color?: string) => {
      if (!selection) return;
      const scaled = scaleSelectionToCurrent(selection);
      if (!scaled) return;

      addHighlightToStore(
        selection.pageNumber,
        selection.text,
        scaled.rects,
        color,
      );

      onAction?.('highlight', {
        text: selection.text,
        pageNumber: selection.pageNumber,
        rects: scaled.rects,
      });
    },
    [selection, scaleSelectionToCurrent, addHighlightToStore, onAction],
  );

  const handleRemoveHighlight = useCallback(() => {
    if (!selection) {
      clearSelection();
      return;
    }
    const scaled = scaleSelectionToCurrent(selection);
    if (scaled) {
      removeHighlight(selection.pageNumber, scaled.rects);
    }
    clearSelection();
  }, [selection, scaleSelectionToCurrent, removeHighlight, clearSelection]);

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
              .textLayer span:hover{font-weight:700}
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
                selectedColorDefault={lastColor}
                onSelectedColorChange={setLastColor}
                onLoadSuccess={setNumPages}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
