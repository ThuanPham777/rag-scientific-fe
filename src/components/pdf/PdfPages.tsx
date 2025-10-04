import { Document, Page } from "react-pdf";
import SelectionPopup from "./SelectionPopup";

type HighlightRect = { top: number; left: number; width: number; height: number };
type Highlight = { id: string; pageNumber: number; rects: HighlightRect[]; text: string };

type SelectionState = {
    pageNumber: number;
    text: string;
    rects: HighlightRect[];
    anchor: { x: number; y: number };
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
        action: "explain" | "summarize" | "related" | "highlight" | "save",
        payload: { text: string; pageNumber: number; rects: HighlightRect[] }
    ) => void;
    onAddHighlight: () => void;
    onLoadSuccess: (numPages: number) => void;
};

export default function PdfPages({
    fileUrl,
    numPages,
    scale,
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
    onLoadSuccess,
}: Props) {
    // Debug
    console.log("PdfPages render:", { fileUrl, numPages, hasFileUrl: !!fileUrl });

    if (!fileUrl) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center text-gray-500">
                    <div className="text-4xl mb-2">📄</div>
                    <div>No PDF file selected</div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center py-6">
            <Document
                file={fileUrl}
                onLoadSuccess={(d) => onLoadSuccess(d.numPages)}
                onLoadError={(error) => {
                    console.error("PDF load error:", error);
                }}
                loading={
                    <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2" />
                            <div className="text-sm text-gray-500">Loading PDF…</div>
                        </div>
                    </div>
                }
            >
                {numPages > 0 &&
                    Array.from({ length: numPages }, (_, idx) => {
                        const pageNumber = idx + 1;
                        const pageHighlights = highlights.filter((h) => h.pageNumber === pageNumber);
                        const show = selection && selection.pageNumber === pageNumber ? selection : null;

                        return (
                            <div
                                key={pageNumber}
                                data-page={pageNumber}
                                ref={(el) => {
                                    pageRefs.current[pageNumber] = el; // dùng ref từ parent
                                }}
                                className={`relative mb-6 shadow ${captureMode ? "select-none" : ""}`}
                                onMouseDown={(e) => {
                                    console.log('PdfPages: Mouse down on page', pageNumber, 'captureMode:', captureMode);
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
                                    renderAnnotationLayer
                                    renderTextLayer
                                    onRenderSuccess={() => onPageRender(pageNumber)}
                                />

                                {/* highlights đã lưu */}
                                {pageHighlights.map((h) =>
                                    h.rects.map((r, i) => (
                                        <div
                                            key={`${h.id}-${i}`}
                                            className="absolute bg-fuchsia-300/40 rounded-[2px] pointer-events-none"
                                            style={{ top: r.top, left: r.left, width: r.width, height: r.height }}
                                        />
                                    ))
                                )}

                                {/* popup khi bôi đen */}
                                {show && !captureMode && (
                                    <SelectionPopup
                                        selection={show}
                                        scale={scale}
                                        onAction={onAction}
                                        onAddHighlight={onAddHighlight}
                                    />
                                )}

                                {/* khung chọn khi capture */}
                                {captureMode &&
                                    dragBox &&
                                    dragBox.pageNumber === pageNumber &&
                                    dragBox.active && (
                                        <div
                                            className="absolute border-2 border-orange-400/80 bg-orange-300/20"
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
