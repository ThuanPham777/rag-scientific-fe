import { Document, Page } from 'react-pdf';
import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { MessageCircle } from 'lucide-react';
import SelectionActionMenu from './SelectionActionMenu';
import HighlightPopup from './HighlightPopup';
import HighlightEditor from './HighlightEditor';
import {
  useUpdateHighlight,
  useAddComment,
  useDeleteHighlight,
} from '../../hooks/queries/useHighlightQueries';
import type { HighlightColor } from '../../services/api/highlight.api';

type HighlightRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};
type Highlight = {
  id: string;
  pageNumber: number;
  rects: HighlightRect[];
  text: string;
  color?: string;
  commentCount?: number; // Number of comments on this highlight
  isFading?: boolean; // For citation jump highlight fade animation
};

type SelectionState = {
  pageNumber: number;
  text: string;
  rects: HighlightRect[];
  anchor: { x: number; y: number };
  pageClientWidth?: number;
  pageClientHeight?: number;
} | null;

type DragBox = {
  active: boolean;
  pageNumber: number;
  x: number;
  y: number;
  w: number;
  h: number;
} | null;

type Props = {
  fileUrl?: string;
  numPages: number;
  scale: number;
  rotation?: number;
  highlights: Highlight[];
  selection: SelectionState;
  captureMode: boolean;
  dragBox: DragBox;

  /** map ref dùng CHUNG với parent */
  pageRefs: React.MutableRefObject<Record<number, HTMLDivElement | null>>;

  onPageRender: (pageNumber: number) => void;

  /** drag handlers (gọi về parent) */
  onStartDrag: (e: React.MouseEvent, pageNumber: number) => void;
  onMoveDrag: (e: React.MouseEvent, pageNumber: number) => void;
  onEndDrag: (pageNumber: number) => void;

  onAction: (
    action: 'explain' | 'summarize' | 'related' | 'highlight' | 'save',
    payload: { text: string; pageNumber: number; rects: HighlightRect[] },
  ) => void;
  onAddHighlight: (
    color?: string,
    comment?: string,
    shouldClose?: boolean,
  ) => void;
  onRemoveHighlight: () => void;
  onFinalizeHighlight?: () => void; // Called when user clicks Save to close editor
  selectedColorDefault?: string;
  onSelectedColorChange?: (color: string | undefined) => void;
  onLoadSuccess: (numPages: number) => void;

  // Auth state for highlight popup functionality
  isAuthenticated?: boolean;
  paperId?: string;
};

// Map hex colors to backend HighlightColor enum
const HEX_TO_ENUM: Record<string, HighlightColor> = {
  '#ffd700': 'YELLOW',
  '#90ee90': 'GREEN',
  '#87ceeb': 'BLUE',
  '#ffb6c1': 'PINK',
  '#ffa500': 'ORANGE',
};

export default function PdfPages({
  fileUrl,
  numPages,
  scale,
  rotation = 0,
  highlights,
  selection,
  captureMode,
  dragBox,
  pageRefs,
  onPageRender,
  onStartDrag,
  onMoveDrag,
  onEndDrag,
  onAction,
  onAddHighlight,
  onRemoveHighlight,
  onFinalizeHighlight,
  selectedColorDefault,
  onSelectedColorChange,
  onLoadSuccess,
  isAuthenticated = false,
  paperId,
}: Props) {
  // Mutations for editing existing highlights
  const updateHighlightMutation = useUpdateHighlight();
  const addCommentMutation = useAddComment();
  const deleteHighlightMutation = useDeleteHighlight();

  // State for clicked highlight popup/editor
  const [clickedHighlight, setClickedHighlight] = useState<{
    highlight: Highlight;
    position: { x: number; y: number };
    hasComments: boolean;
  } | null>(null);

  // Handle click on existing highlight
  const handleHighlightClick = useCallback(
    (
      e: React.MouseEvent,
      highlight: Highlight,
      pageEl: HTMLDivElement | null,
    ) => {
      e.stopPropagation();
      e.preventDefault();

      if (!pageEl || !isAuthenticated || !paperId) return;

      // Get reference element (textLayer if exists) for coordinate calculation
      const textLayer = pageEl.querySelector(
        '.textLayer',
      ) as HTMLElement | null;
      const referenceEl = textLayer || pageEl;
      const refRect = referenceEl.getBoundingClientRect();
      const refWidth = referenceEl.clientWidth;
      const refHeight = referenceEl.clientHeight;

      // Get the first rect of the highlight to position the popup
      const firstRect = highlight.rects[0];
      if (!firstRect) return;

      // Convert normalized coords to pixels if needed
      const rectTop =
        firstRect.top <= 1 ? firstRect.top * refHeight : firstRect.top;
      const rectLeft =
        firstRect.left <= 1 ? firstRect.left * refWidth : firstRect.left;
      const rectWidth =
        firstRect.width <= 1 ? firstRect.width * refWidth : firstRect.width;

      // Position popup to the right of the highlight
      const popupX = refRect.left + rectLeft + rectWidth + 12;
      const popupY = refRect.top + rectTop;

      setClickedHighlight({
        highlight,
        position: {
          x: popupX,
          y: popupY,
        },
        hasComments: (highlight.commentCount ?? 0) > 0,
      });
    },
    [isAuthenticated, paperId],
  );

  // Close highlight popup
  const handleCloseHighlightPopup = useCallback(() => {
    setClickedHighlight(null);
  }, []);

  // Debug
  console.log('PdfPages render:', { fileUrl, numPages, hasFileUrl: !!fileUrl });

  if (!fileUrl) {
    return (
      <div className='flex items-center justify-center py-12'>
        <div className='text-center text-gray-500'>
          <div className='text-4xl mb-2'>📄</div>
          <div>No PDF file selected</div>
        </div>
      </div>
    );
  }

  return (
    <div className='flex flex-col items-center py-6 min-w-fit'>
      <Document
        file={fileUrl}
        onLoadSuccess={(d) => onLoadSuccess(d.numPages)}
        onLoadError={(error) => {
          console.error('PDF load error:', error);
        }}
        loading={
          <div className='flex items-center justify-center py-12'>
            <div className='text-center'>
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2' />
              <div className='text-sm text-gray-500'>Loading PDF…</div>
            </div>
          </div>
        }
      >
        {numPages > 0 &&
          Array.from({ length: numPages }, (_, idx) => {
            const pageNumber = idx + 1;
            const pageHighlights = highlights.filter(
              (h) => h.pageNumber === pageNumber,
            );
            // Scale selection coordinates from when selection was made to current page size
            let show = null;
            if (selection && selection.pageNumber === pageNumber) {
              const pageEl = pageRefs.current[pageNumber];
              if (pageEl && selection.pageClientWidth) {
                const fx = pageEl.clientWidth / selection.pageClientWidth;
                const fy =
                  pageEl.clientHeight /
                  (selection.pageClientHeight || pageEl.clientHeight);
                const rects = selection.rects.map((r) => ({
                  top: r.top * fy,
                  left: r.left * fx,
                  width: r.width * fx,
                  height: r.height * fy,
                }));
                const anchor = {
                  x: selection.anchor.x * fx,
                  y: selection.anchor.y * fy,
                };
                show = { ...selection, rects, anchor };
              } else {
                show = selection;
              }
            }

            return (
              <div
                key={pageNumber}
                data-page={pageNumber}
                ref={(el) => {
                  pageRefs.current[pageNumber] = el; // dùng ref từ parent
                }}
                className={`relative mb-6 shadow ${
                  captureMode ? 'select-none' : ''
                }`}
                onMouseDown={(e) => {
                  console.log(
                    'PdfPages: Mouse down on page',
                    pageNumber,
                    'captureMode:',
                    captureMode,
                  );
                  onStartDrag(e, pageNumber);
                }}
                onMouseMove={(e) => onMoveDrag(e, pageNumber)}
                onMouseUp={() => {
                  console.log('PdfPages: Mouse up on page', pageNumber);
                  onEndDrag(pageNumber);
                }}
              >
                <Page
                  pageNumber={pageNumber}
                  scale={scale}
                  rotate={rotation}
                  renderAnnotationLayer
                  renderTextLayer
                  onRenderSuccess={() => onPageRender(pageNumber)}
                />

                {/* highlights đã lưu */}
                {pageHighlights.map((h) =>
                  h.rects.map((r, i) => {
                    const color = h.color || '#ffd700'; // default yellow
                    // convert HEX like #rrggbb to rgba with 0.35 alpha for better visibility
                    const hex = color.replace('#', '');
                    const r255 = parseInt(hex.substring(0, 2), 16);
                    const g255 = parseInt(hex.substring(2, 4), 16);
                    const b255 = parseInt(hex.substring(4, 6), 16);
                    const bg = `rgba(${r255}, ${g255}, ${b255}, 0.35)`;

                    // stored rects may be normalized (0..1) or legacy pixels.
                    const pageEl = pageRefs.current[pageNumber];
                    const textLayer = pageEl?.querySelector(
                      '.textLayer',
                    ) as HTMLElement | null;

                    // Use textLayer dimensions for coordinate conversion
                    const referenceEl = textLayer || pageEl;

                    let top = r.top;
                    let left = r.left;
                    let width = r.width;
                    let height = r.height;

                    if (pageEl && referenceEl) {
                      // Calculate offset between page container and textLayer
                      const pageBox = pageEl.getBoundingClientRect();
                      const refBox = referenceEl.getBoundingClientRect();
                      const offsetTop = refBox.top - pageBox.top;
                      const offsetLeft = refBox.left - pageBox.left;

                      // Convert normalized (0-1) coordinates to pixel coordinates
                      const refWidth = referenceEl.clientWidth;
                      const refHeight = referenceEl.clientHeight;

                      top =
                        (r.top <= 1 ? r.top * refHeight : r.top) + offsetTop;
                      left =
                        (r.left <= 1 ? r.left * refWidth : r.left) + offsetLeft;
                      width = r.width <= 1 ? r.width * refWidth : r.width;
                      height = r.height <= 1 ? r.height * refHeight : r.height;
                    }

                    // Only the first rect gets the comment indicator and click handler
                    const isFirstRect = i === 0;
                    const hasComments = (h.commentCount ?? 0) > 0;
                    const isJumpHighlight =
                      h.id.startsWith('jump-') || h.id.startsWith('temp-');
                    const isClickable =
                      isAuthenticated && paperId && !isJumpHighlight;
                    const isFading = h.isFading ?? false;

                    return (
                      <div
                        key={`${h.id}-${i}`}
                        className={`absolute rounded-[2px] ${
                          isClickable
                            ? 'cursor-pointer hover:brightness-95'
                            : ''
                        } ${isJumpHighlight ? 'transition-opacity duration-1000' : ''} ${
                          isFading ? 'opacity-0' : 'opacity-100'
                        }`}
                        style={{
                          top,
                          left,
                          width,
                          height,
                          backgroundColor: bg,
                          // Use mix-blend-mode to prevent font rendering issues
                          mixBlendMode: 'multiply',
                          // Ensure highlight is above textLayer (z-index 2) for click handling
                          // but still allows text selection through non-clickable areas
                          zIndex: isJumpHighlight ? 5 : isClickable ? 3 : 1,
                          // Allow text selection through the highlight when not clickable
                          pointerEvents: isClickable ? 'auto' : 'none',
                        }}
                        onClick={
                          isClickable
                            ? (e) => handleHighlightClick(e, h, pageEl)
                            : undefined
                        }
                      >
                        {/* Comment indicator - only on first rect of highlight with comments */}
                        {isFirstRect && hasComments && (
                          <div
                            className='absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center shadow-sm border border-white'
                            style={{ backgroundColor: color, zIndex: 10 }}
                          >
                            <MessageCircle
                              size={10}
                              className='text-white'
                            />
                          </div>
                        )}
                      </div>
                    );
                  }),
                )}

                {/* popup khi bôi đen */}
                {show && !captureMode && (
                  <SelectionActionMenu
                    selection={show}
                    scale={scale}
                    onAction={onAction}
                    onAddHighlight={onAddHighlight}
                    onRemoveHighlight={onRemoveHighlight}
                    onFinalizeHighlight={onFinalizeHighlight}
                    selectedColorDefault={selectedColorDefault}
                    onSelectedColorChange={onSelectedColorChange}
                    pageRef={pageRefs.current[pageNumber]}
                  />
                )}

                {/* khung chọn khi capture */}
                {captureMode &&
                  dragBox &&
                  dragBox.pageNumber === pageNumber &&
                  dragBox.active && (
                    <div
                      className='absolute border-2 border-orange-400/80 bg-orange-300/20'
                      style={{
                        left: dragBox.x,
                        top: dragBox.y,
                        width: dragBox.w,
                        height: dragBox.h,
                      }}
                    />
                  )}
              </div>
            );
          })}
      </Document>

      {/* Highlight popup for viewing/editing comments - show HighlightPopup if has comments, else HighlightEditor */}
      {clickedHighlight &&
        paperId &&
        (clickedHighlight.hasComments ? (
          <HighlightPopup
            highlightId={clickedHighlight.highlight.id}
            paperId={paperId}
            position={clickedHighlight.position}
            highlightColor={clickedHighlight.highlight.color || '#ffd700'}
            onClose={handleCloseHighlightPopup}
          />
        ) : (
          createPortal(
            <div
              className='fixed inset-0'
              style={{ zIndex: 99998 }}
              onClick={handleCloseHighlightPopup}
            >
              <div onClick={(e) => e.stopPropagation()}>
                <HighlightEditor
                  onSelectColor={(color) => {
                    // Update highlight color via API
                    const colorEnum = HEX_TO_ENUM[color] || 'YELLOW';
                    updateHighlightMutation.mutate({
                      highlightId: clickedHighlight.highlight.id,
                      color: colorEnum,
                      paperId,
                    });
                    // Optimistically update local state so UI reflects new color immediately
                    setClickedHighlight((prev) =>
                      prev
                        ? {
                            ...prev,
                            highlight: { ...prev.highlight, color },
                          }
                        : null,
                    );
                  }}
                  onRemoveHighlight={() => {
                    // Delete highlight via API
                    deleteHighlightMutation.mutate({
                      highlightId: clickedHighlight.highlight.id,
                      paperId,
                    });
                    handleCloseHighlightPopup();
                  }}
                  selectedColor={clickedHighlight.highlight.color || '#ffd700'}
                  onSaveComment={(comment) => {
                    // Add comment to existing highlight
                    if (comment.trim()) {
                      addCommentMutation.mutate({
                        highlightId: clickedHighlight.highlight.id,
                        content: comment.trim(),
                        paperId,
                      });
                    }
                    handleCloseHighlightPopup();
                  }}
                  position={{
                    top: clickedHighlight.position.y,
                    left: clickedHighlight.position.x,
                  }}
                  usePortal={false}
                />
              </div>
            </div>,
            document.body,
          )
        ))}
    </div>
  );
}
