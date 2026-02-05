// Zoom hook - manages zoom state and actions
import { useState, useCallback } from 'react';

export interface UseZoomOptions {
  minScale?: number;
  maxScale?: number;
  step?: number;
  initialScale?: number;
}

export function usePdfZoom(options: UseZoomOptions = {}) {
  const {
    minScale = 0.5,
    maxScale = 3,
    step = 0.1,
    initialScale = 1.0,
  } = options;

  const [scale, setScale] = useState(initialScale);

  const zoomIn = useCallback(() => {
    setScale((s) => Math.min(maxScale, +(s + step).toFixed(2)));
  }, [maxScale, step]);

  const zoomOut = useCallback(() => {
    setScale((s) => Math.max(minScale, +(s - step).toFixed(2)));
  }, [minScale, step]);

  const resetZoom = useCallback(() => {
    setScale(initialScale);
  }, [initialScale]);

  const setZoom = useCallback(
    (value: number) => {
      setScale(Math.max(minScale, Math.min(maxScale, value)));
    },
    [minScale, maxScale],
  );

  return {
    scale,
    setScale: setZoom,
    zoomIn,
    zoomOut,
    resetZoom,
  };
}
