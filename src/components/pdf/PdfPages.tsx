import { Document, Page } from 'react-pdf';
import SelectionPopup from './SelectionPopup';

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
  onAddHighlight: (color?: string) => void;
  onRemoveHighlight: () => void;
  selectedColorDefault?: string;
  onSelectedColorChange?: (color: string | undefined) => void;
  onLoadSuccess: (numPages: number) => void;
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
  selectedColorDefault,
  onSelectedColorChange,
  onLoadSuccess,
}: Props) {
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
                    // convert HEX like #rrggbb to rgba with 0.4 alpha
                    const hex = color.replace('#', '');
                    const r255 = parseInt(hex.substring(0, 2), 16);
                    const g255 = parseInt(hex.substring(2, 4), 16);
                    const b255 = parseInt(hex.substring(4, 6), 16);
                    const bg = `rgba(${r255}, ${g255}, ${b255}, 0.4)`;

                    // stored rects may be normalized (0..1) or legacy pixels.
                    const pageEl = pageRefs.current[pageNumber];
                    const textLayer =
                      (pageEl?.querySelector(
                        '.textLayer',
                      ) as HTMLElement | null) || pageEl;

                    let top = r.top;
                    let left = r.left;
                    let width = r.width;
                    let height = r.height;

                    if (pageEl && textLayer) {
                      const pageBox = pageEl.getBoundingClientRect();
                      const layerBox = textLayer.getBoundingClientRect();
                      const offsetTop = layerBox.top - pageBox.top;
                      const offsetLeft = layerBox.left - pageBox.left;

                      top =
                        (r.top <= 1 ? r.top * textLayer.clientHeight : r.top) +
                        offsetTop;
                      left =
                        (r.left <= 1
                          ? r.left * textLayer.clientWidth
                          : r.left) + offsetLeft;
                      width =
                        r.width <= 1
                          ? r.width * textLayer.clientWidth
                          : r.width;
                      height =
                        r.height <= 1
                          ? r.height * textLayer.clientHeight
                          : r.height;
                    }

                    return (
                      <div
                        key={`${h.id}-${i}`}
                        className='absolute rounded-[2px] pointer-events-none'
                        style={{
                          top,
                          left,
                          width,
                          height,
                          backgroundColor: bg,
                        }}
                      />
                    );
                  }),
                )}

                {/* popup khi bôi đen */}
                {show && !captureMode && (
                  <SelectionPopup
                    selection={show}
                    scale={scale}
                    onAction={onAction}
                    onAddHighlight={onAddHighlight}
                    onRemoveHighlight={onRemoveHighlight}
                    selectedColorDefault={selectedColorDefault}
                    onSelectedColorChange={onSelectedColorChange}
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
    </div>
  );
}
