// Capture hook - manages screenshot/capture mode for PDF regions
import { useState, useCallback, useEffect } from 'react';

export type DragBox = {
  active: boolean;
  pageNumber: number;
  x: number;
  y: number;
  w: number;
  h: number;
} | null;

export interface UseCaptureOptions {
  pageRefs: React.MutableRefObject<Record<number, HTMLDivElement | null>>;
  onCapture?: (
    pageNumber: number,
    imageDataUrl: string,
    rect: { top: number; left: number; width: number; height: number },
  ) => void;
}

export function usePdfCapture(options: UseCaptureOptions) {
  const { pageRefs, onCapture } = options;

  const [captureMode, setCaptureMode] = useState(false);
  const [dragBox, setDragBox] = useState<DragBox>(null);

  const toggleCapture = useCallback(() => {
    setCaptureMode((v) => !v);
    setDragBox(null);
  }, []);

  const exitCapture = useCallback(() => {
    setCaptureMode(false);
    setDragBox(null);
  }, []);

  const onStartDrag = useCallback(
    (e: React.MouseEvent, pageNumber: number) => {
      if (!captureMode) return;
      const pageEl = pageRefs.current[pageNumber];
      if (!pageEl) return;

      const box = pageEl.getBoundingClientRect();
      const x = e.clientX - box.left;
      const y = e.clientY - box.top;
      setDragBox({ active: true, pageNumber, x, y, w: 0, h: 0 });
    },
    [captureMode, pageRefs],
  );

  const onMoveDrag = useCallback(
    (e: React.MouseEvent, pageNumber: number) => {
      if (!captureMode || !dragBox?.active || dragBox.pageNumber !== pageNumber)
        return;
      const pageEl = pageRefs.current[pageNumber];
      if (!pageEl) return;

      const box = pageEl.getBoundingClientRect();
      const curX = e.clientX - box.left;
      const curY = e.clientY - box.top;
      const w = Math.abs(curX - dragBox.x);
      const h = Math.abs(curY - dragBox.y);
      const nx = Math.min(dragBox.x, curX);
      const ny = Math.min(dragBox.y, curY);
      setDragBox({ active: true, pageNumber, x: nx, y: ny, w, h });
    },
    [captureMode, dragBox, pageRefs],
  );

  const onEndDrag = useCallback(
    (pageNumber: number) => {
      if (!captureMode || !dragBox) return;

      const pageEl = pageRefs.current[pageNumber];
      if (!pageEl) {
        setDragBox(null);
        setCaptureMode(false);
        return;
      }

      const canvas = pageEl.querySelector('canvas') as HTMLCanvasElement | null;
      if (canvas && dragBox.w > 3 && dragBox.h > 3) {
        const scaleX = canvas.width / pageEl.clientWidth;
        const scaleY = canvas.height / pageEl.clientHeight;

        const sx = Math.round(dragBox.x * scaleX);
        const sy = Math.round(dragBox.y * scaleY);
        const sw = Math.round(dragBox.w * scaleX);
        const sh = Math.round(dragBox.h * scaleY);

        const out = document.createElement('canvas');
        out.width = sw;
        out.height = sh;
        const octx = out.getContext('2d')!;
        octx.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);
        const dataUrl = out.toDataURL('image/png');

        onCapture?.(pageNumber, dataUrl, {
          top: dragBox.y,
          left: dragBox.x,
          width: dragBox.w,
          height: dragBox.h,
        });
      }

      setDragBox(null);
      setCaptureMode(false);
    },
    [captureMode, dragBox, pageRefs, onCapture],
  );

  // Global mouse events for drag
  useEffect(() => {
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

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [captureMode, dragBox, pageRefs, onEndDrag]);

  // Exit on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && captureMode) {
        exitCapture();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [captureMode, exitCapture]);

  return {
    captureMode,
    dragBox,
    toggleCapture,
    exitCapture,
    onStartDrag,
    onMoveDrag,
    onEndDrag,
  };
}
