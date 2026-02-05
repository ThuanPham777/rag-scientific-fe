// Keyboard shortcuts hook for PDF viewer
import { useEffect } from 'react';

export interface UseKeyboardOptions {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onEscape?: () => void;
  enabled?: boolean;
}

export function usePdfKeyboard(options: UseKeyboardOptions) {
  const { onZoomIn, onZoomOut, onEscape, enabled = true } = options;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onEscape?.();
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        onZoomIn();
      } else if (e.key === '-') {
        e.preventDefault();
        onZoomOut();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled, onZoomIn, onZoomOut, onEscape]);
}
