// src/components/pdf/PdfViewer.tsx
import { useEffect, useRef, useState } from "react";
import PdfToolbar from "./PdfToolbar";
import PdfPages from "./PdfPages";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

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

type JumpHighlight = {
  pageNumber: number;
  rect: HighlightRect;
};

type Props = {
  fileUrl?: string;
  jumpToPage?: number;
  jumpHighlight?: JumpHighlight | null;
  onAction?: (
    action: "explain" | "summarize" | "related" | "highlight" | "save",
    payload: {
      text: string;
      pageNumber: number;
      rects: HighlightRect[];
      imageDataUrl?: string;
    }
  ) => void;
};

type PageIndex = {
  text: string;
  spans: { start: number; end: number; el: HTMLSpanElement }[];
};

export default function PdfViewer({
  fileUrl,
  jumpToPage,
  jumpHighlight,
  onAction,
}: Props) {
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.0);

  // === Highlight + Selection =================================================
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [lastColor, setLastColor] = useState<string | undefined>("#ffd700");
  const [sel, setSel] = useState<{
    pageNumber: number;
    text: string;
    rects: HighlightRect[];
    anchor: { x: number; y: number };
    pageClientWidth?: number;
    pageClientHeight?: number;
  } | null>(null);

  // === Capture (ảnh) mode ====================================================
  const [captureMode, setCaptureMode] = useState(false);
  const [dragBox, setDragBox] = useState<{
    active: boolean;
    pageNumber: number;
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);

  // === Search ================================================================
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState("");
  const [matchCase, setMatchCase] = useState(false);
  const [wholeWords, setWholeWords] = useState(false);
  const [hits, setHits] = useState<
    { pageNumber: number; rects: HighlightRect[] }[]
  >([]);
  const [hitIndex, setHitIndex] = useState(0);

  // Refs
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const viewerScrollRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const pageIndexRef = useRef<Record<number, PageIndex>>({});

  // reset khi đổi file
  useEffect(() => {
    setNumPages(0);
    setHighlights([]);
    setSel(null);
    setCaptureMode(false);
    setDragBox(null);
    setHits([]);
    setHitIndex(0);
  }, [fileUrl]);

  // selection text popup
  useEffect(() => {
    const handleMouseUp = () => {
      if (captureMode) return;
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        setSel(null);
        return;
      }
      const text = selection.toString().trim();
      if (!text) {
        setSel(null);
        return;
      }
      const anchorNode = selection.anchorNode as Node | null;
      const pageEl = (
        anchorNode instanceof HTMLElement
          ? anchorNode
          : (anchorNode?.parentElement as HTMLElement)
      )?.closest("[data-page]") as HTMLElement | null;

      if (!pageEl) return;

      const pageNumber = Number(pageEl.getAttribute("data-page") || 1);
      const pageBounds = pageEl.getBoundingClientRect();
      const range = selection.getRangeAt(0);
      const rectsDom = Array.from(range.getClientRects());

      const rects: HighlightRect[] = rectsDom.map((r) => ({
        top: r.top - pageBounds.top,
        left: r.left - pageBounds.left,
        width: r.width,
        height: r.height,
      }));

      const first = rects[0];
      const anchor = { x: first.left + first.width + 12, y: first.top };

      const pageClientWidth = pageEl.clientWidth;
      const pageClientHeight = pageEl.clientHeight;

      setSel({
        pageNumber,
        text,
        rects,
        anchor,
        pageClientWidth,
        pageClientHeight,
      });
    };

    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, [captureMode]);

  // cuộn viewer ⇒ ẩn popup
  useEffect(() => {
    const el = viewerScrollRef.current;
    if (!el) return;
    const h = () => setSel(null);
    el.addEventListener("scroll", h, { passive: true });
    return () => el.removeEventListener("scroll", h);
  }, []);

  // zoom
  const zoomOut = () => setScale((s) => Math.max(0.5, +(s - 0.1).toFixed(2)));
  const zoomIn = () => setScale((s) => Math.min(3, +(s + 0.1).toFixed(2)));

  // Keyboard shortcuts + global mouse (capture)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSel(null);
        setCaptureMode(false);
      } else if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        zoomIn();
      } else if (e.key === "-") {
        e.preventDefault();
        zoomOut();
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!captureMode || !dragBox?.active) return;
      const pageEl = pageRefs.current[dragBox.pageNumber];
      if (!pageEl) return;

      const box = pageEl.getBoundingClientRect();
      const curX = e.clientX - box.left;
      const curY = e.clientY - box.top;
      const w = Math.abs(curX - dragBox.x);
      const h = Math.abs(curY - dragBox.y);
      const nx = Math.min(dragBox.x, curX);
      const ny = Math.min(dragBox.y, curY);
      setDragBox({
        active: true,
        pageNumber: dragBox.pageNumber,
        x: nx,
        y: ny,
        w,
        h,
      });
    };

    const handleMouseUp = () => {
      if (!captureMode || !dragBox?.active) return;
      onEndDrag(dragBox.pageNumber);
    };

    const closeOnClickOutside = (e: MouseEvent) => {
      if (!popupRef.current) return;
      if (!popupRef.current.contains(e.target as Node)) {
        setSel(null);
        window.getSelection()?.removeAllRanges?.();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", closeOnClickOutside);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", closeOnClickOutside);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [zoomIn, zoomOut, captureMode, dragBox]);

  // Jump tới page (cũ, theo pageNumber thôi)
  useEffect(() => {
    if (!jumpToPage) return;
    const pageEl = pageRefs.current[jumpToPage];
    if (!pageEl) return;
    pageEl.scrollIntoView({ behavior: "smooth", block: "start" });
    // 🔥 ĐÃ XÓA: logic thêm class ring-4 để không bị nháy
  }, [jumpToPage]);

  // 🔥 Jump + flash highlight từ Summary
  useEffect(() => {
    if (!jumpHighlight) return;
    const { pageNumber } = jumpHighlight;

    const pageEl = pageRefs.current[pageNumber];
    if (pageEl) {
      pageEl.scrollIntoView({ behavior: "smooth", block: "center" });
      // 🔥 ĐÃ XÓA: logic thêm class ring-4
    }
  }, [jumpHighlight]);

  // tạo temporary highlight overlay cho jumpHighlight
  useEffect(() => {
    if (!jumpHighlight) return;
    const { pageNumber, rect } = jumpHighlight;
    const id = `jump-${pageNumber}-${Date.now()}`;

    // Clear any existing jump highlights before adding new one
    setHighlights((prev) => [
      ...prev.filter((x) => !x.id.startsWith("jump-")),
      {
        id,
        pageNumber,
        rects: [rect],
        text: "",
        color: "#fff3b0",
      },
    ]);

    const timeout = setTimeout(() => {
      setHighlights((prev) => prev.filter((x) => !x.id.startsWith("jump-")));
    }, 3000);

    return () => clearTimeout(timeout);
  }, [jumpHighlight]);

  // =================== EXPLAIN (capture ảnh) ================================
  const toggleCapture = () => {
    setCaptureMode((v) => !v);
    setSel(null);
  };

  const onStartDrag = (e: React.MouseEvent, pageNumber: number) => {
    if (!captureMode) return;
    const pageEl = pageRefs.current[pageNumber]!;
    const box = pageEl.getBoundingClientRect();
    const x = e.clientX - box.left;
    const y = e.clientY - box.top;
    setDragBox({ active: true, pageNumber, x, y, w: 0, h: 0 });
  };

  const onMoveDrag = (e: React.MouseEvent, pageNumber: number) => {
    if (!captureMode || !dragBox?.active || dragBox.pageNumber !== pageNumber)
      return;
    const pageEl = pageRefs.current[pageNumber]!;
    const box = pageEl.getBoundingClientRect();
    const curX = e.clientX - box.left;
    const curY = e.clientY - box.top;
    const w = Math.abs(curX - dragBox.x);
    const h = Math.abs(curY - dragBox.y);
    const nx = Math.min(dragBox.x, curX);
    const ny = Math.min(dragBox.y, curY);
    setDragBox({ active: true, pageNumber, x: nx, y: ny, w, h });
  };

  const onEndDrag = (pageNumber: number) => {
    if (!captureMode || !dragBox) return;

    const pageEl = pageRefs.current[pageNumber]!;
    const canvas = pageEl.querySelector("canvas") as HTMLCanvasElement | null;
    if (canvas && dragBox.w > 3 && dragBox.h > 3) {
      const scaleX = canvas.width / pageEl.clientWidth;
      const scaleY = canvas.height / pageEl.clientHeight;

      const sx = Math.round(dragBox.x * scaleX);
      const sy = Math.round(dragBox.y * scaleY);
      const sw = Math.round(dragBox.w * scaleX);
      const sh = Math.round(dragBox.h * scaleY);

      const out = document.createElement("canvas");
      out.width = sw;
      out.height = sh;
      const octx = out.getContext("2d")!;
      octx.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);
      const dataUrl = out.toDataURL("image/png");

      onAction?.("explain", {
        text: "",
        pageNumber,
        rects: [
          {
            top: dragBox.y,
            left: dragBox.x,
            width: dragBox.w,
            height: dragBox.h,
          },
        ],
        imageDataUrl: dataUrl,
      });
    }
    setDragBox(null);
    setCaptureMode(false);
  };

  // =================== SEARCH =================================================
  const onPageRender = (pageNumber: number) => {
    const pageEl = pageRefs.current[pageNumber];
    if (!pageEl) return;
    let textLayer = pageEl.querySelector(".textLayer") as HTMLElement | null;
    if (!textLayer) {
      setTimeout(() => onPageRender(pageNumber), 60);
      return;
    }

    const spans = Array.from(
      textLayer.querySelectorAll("span")
    ) as HTMLSpanElement[];
    let text = "";
    let cursor = 0;
    const entries: PageIndex["spans"] = [];

    spans.forEach((s) => {
      const t = s.textContent ?? "";
      const start = cursor;
      const end = cursor + t.length;
      cursor = end;
      text += t;
      entries.push({ start, end, el: s });
    });

    pageIndexRef.current[pageNumber] = { text, spans: entries };
  };

  const buildRegex = () => {
    if (!query.trim()) return null;
    const esc = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = wholeWords ? `\\b${esc}\\b` : esc;
    return new RegExp(pattern, matchCase ? "g" : "gi");
  };

  const clearSearchOverlays = (pageNumber: number) => {
    const pageEl = pageRefs.current[pageNumber];
    if (!pageEl) return;
    pageEl.querySelectorAll(".pdf-search-hit").forEach((el) => el.remove());
  };

  const overlayForRange = (range: Range, pageEl: HTMLElement) => {
    const pageBox = pageEl.getBoundingClientRect();
    const rects = Array.from(range.getClientRects()).map((r) => ({
      top: r.top - pageBox.top,
      left: r.left - pageBox.left,
      width: r.width,
      height: r.height,
    }));
    rects.forEach((r) => {
      const div = document.createElement("div");
      div.className =
        "pdf-search-hit absolute bg-yellow-300/40 rounded-[2px] pointer-events-none";
      Object.assign(div.style, {
        top: `${r.top}px`,
        left: `${r.left}px`,
        width: `${r.width}px`,
        height: `${r.height}px`,
      });
      pageEl.appendChild(div);
    });
    return rects;
  };

  const runSearch = () => {
    if (!query.trim()) {
      setHits([]);
      setHitIndex(0);
      for (let p = 1; p <= numPages; p++) clearSearchOverlays(p);
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
          start - spanStart.start
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
        block: "center",
      });
      viewerScrollRef.current?.scrollBy({
        top: Math.max(0, first.top - 80),
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    const t = setTimeout(runSearch, 140);
    return () => clearTimeout(t);
  }, [query, matchCase, wholeWords, numPages, scale]);

  const gotoHit = (dir: 1 | -1) => {
    if (!hits.length) return;
    const total = hits.reduce((s, h) => s + h.rects.length, 0);
    let next = (hitIndex + (dir === 1 ? 1 : total - 1)) % total;
    setHitIndex(next);

    let k = 0;
    for (const h of hits) {
      for (const r of h.rects) {
        if (k === next) {
          pageRefs.current[h.pageNumber]?.scrollIntoView({ block: "center" });
          viewerScrollRef.current?.scrollBy({
            top: Math.max(0, r.top - 80),
            behavior: "smooth",
          });
          return;
        }
        k++;
      }
    }
  };

  // === helpers ===============================================================
  const getBBox = (rects: HighlightRect[]) => {
    const left = Math.min(...rects.map((r) => r.left));
    const top = Math.min(...rects.map((r) => r.top));
    const right = Math.max(...rects.map((r) => r.left + r.width));
    const bottom = Math.max(...rects.map((r) => r.top + r.height));
    return {
      left,
      top,
      right,
      bottom,
      width: right - left,
      height: bottom - top,
    };
  };

  const scaleSelectionToCurrent = (s: typeof sel) => {
    if (!s) return s;
    const pageEl = pageRefs.current[s.pageNumber];
    if (!pageEl) return s;
    const baseW = s.pageClientWidth || pageEl.clientWidth;
    const baseH = s.pageClientHeight || pageEl.clientHeight;
    const fx = pageEl.clientWidth / baseW;
    const fy = pageEl.clientHeight / baseH;
    const rects = s.rects.map((r) => ({
      top: r.top * fy,
      left: r.left * fx,
      width: r.width * fx,
      height: r.height * fy,
    }));
    const anchor = { x: s.anchor.x * fx, y: s.anchor.y * fy };
    return { ...s, rects, anchor } as typeof sel;
  };

  const overlapRatio = (
    a: { left: number; top: number; right: number; bottom: number },
    b: { left: number; top: number; right: number; bottom: number }
  ) => {
    const x1 = Math.max(a.left, b.left);
    const y1 = Math.max(a.top, b.top);
    const x2 = Math.min(a.right, b.right);
    const y2 = Math.min(a.bottom, b.bottom);
    if (x2 <= x1 || y2 <= y1) return 0;
    const inter = (x2 - x1) * (y2 - y1);
    const areaA = (a.right - a.left) * (a.bottom - a.top);
    const areaB = (b.right - b.left) * (b.bottom - b.top);
    return inter / Math.min(areaA, areaB);
  };

  const addHighlight = (color?: string) => {
    if (!sel) return;
    const scaled = scaleSelectionToCurrent(sel);
    const pageEl = pageRefs.current[scaled!.pageNumber];
    let normalized = scaled!.rects;
    if (pageEl) {
      const pw = pageEl.clientWidth;
      const ph = pageEl.clientHeight;
      normalized = scaled!.rects.map((r) => ({
        top: r.top / ph,
        left: r.left / pw,
        width: r.width / pw,
        height: r.height / ph,
      }));
    }

    setHighlights((hs) => {
      const page = scaled!.pageNumber;
      const pw = pageEl?.clientWidth || 1;
      const ph = pageEl?.clientHeight || 1;
      const newBox = getBBox(scaled!.rects);
      const filtered = hs.filter((h) => {
        if (h.pageNumber !== page) return true;
        const oldRectsPx = h.rects.map((r) => {
          if (r.left <= 1 && r.width <= 1 && r.top <= 1 && r.height <= 1) {
            return {
              top: r.top * ph,
              left: r.left * pw,
              width: r.width * pw,
              height: r.height * ph,
            };
          }
          return r as HighlightRect;
        });
        const oldBox = getBBox(oldRectsPx);
        const ratio = overlapRatio(newBox, oldBox);
        const areaNew = newBox.width * newBox.height;
        const areaOld = oldBox.width * oldBox.height;
        if (ratio > 0.85 && areaNew >= areaOld * 0.9) {
          return false;
        }
        return true;
      });
      return [
        ...filtered,
        {
          id: crypto.randomUUID(),
          pageNumber: sel.pageNumber,
          rects: normalized,
          text: sel.text,
          color,
        },
      ];
    });

    onAction?.("highlight", {
      text: sel.text,
      pageNumber: sel.pageNumber,
      rects: scaled!.rects,
    });
  };

  const cancelHighlight = () => {
    if (!sel) {
      setSel(null);
      return;
    }
    const scaled = scaleSelectionToCurrent(sel);
    setHighlights((hs) => {
      const page = scaled!.pageNumber;
      const pageEl = pageRefs.current[page];
      const pw = pageEl?.clientWidth || 1;
      const ph = pageEl?.clientHeight || 1;
      const curBox = getBBox(scaled!.rects);
      return hs.filter((h) => {
        if (h.pageNumber !== page) return true;
        const oldRectsPx = h.rects.map((r) => {
          if (r.left <= 1 && r.width <= 1 && r.top <= 1 && r.height <= 1) {
            return {
              top: r.top * ph,
              left: r.left * pw,
              width: r.width * pw,
              height: r.height * ph,
            };
          }
          return r as HighlightRect;
        });
        const oldBox = getBBox(oldRectsPx);
        const ratio = overlapRatio(curBox, oldBox);
        return ratio < 0.85;
      });
    });
    setSel(null);
  };

  const fire = (
    type: NonNullable<Parameters<NonNullable<Props["onAction"]>>[0]>
  ) => {
    if (!sel) return;
    const scaled = scaleSelectionToCurrent(sel);
    onAction?.(type, {
      text: sel.text,
      pageNumber: sel.pageNumber,
      rects: scaled!.rects,
    });
    setSel(null);
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <PdfToolbar
        showSearch={showSearch}
        onToggleSearch={() => setShowSearch((v) => !v)}
        query={query}
        onQueryChange={setQuery}
        hits={hits}
        hitIndex={hitIndex}
        onGotoHit={gotoHit}
        onRunSearch={runSearch}
        matchCase={matchCase}
        onMatchCaseChange={setMatchCase}
        wholeWords={wholeWords}
        onWholeWordsChange={setWholeWords}
        onToggleCapture={toggleCapture}
        captureMode={captureMode}
        zoomIn={zoomIn}
        zoomOut={zoomOut}
        scale={scale}
        setScale={setScale}
      />

      <div
        ref={viewerScrollRef}
        className={`flex-1 overflow-auto bg-gray-50 min-h-0 ${
          captureMode ? "cursor-crosshair" : ""
        }`}
      >
        <style>{`.textLayer span:hover{font-weight:700}`}</style>
        {!fileUrl ? (
          <div className="p-6 text-sm text-gray-500">No PDF selected.</div>
        ) : (
          <PdfPages
            fileUrl={fileUrl}
            numPages={numPages}
            scale={scale}
            highlights={highlights}
            selection={sel}
            captureMode={captureMode}
            dragBox={dragBox}
            pageRefs={pageRefs}
            onPageRender={onPageRender}
            onStartDrag={onStartDrag}
            onMoveDrag={onMoveDrag}
            onEndDrag={onEndDrag}
            onAction={fire}
            onAddHighlight={addHighlight}
            onRemoveHighlight={cancelHighlight}
            selectedColorDefault={lastColor}
            onSelectedColorChange={setLastColor}
            onLoadSuccess={setNumPages}
          />
        )}
      </div>
    </div>
  );
}