// Keyboard shortcuts hook for PDF viewer
import { useEffect } from 'react';

export interface UseKeyboardOptions {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onEscape?: () => void;
  onToggleSearch?: () => void;
  onNextMatch?: () => void;
  onPrevMatch?: () => void;
  enabled?: boolean;
}

export function usePdfKeyboard(options: UseKeyboardOptions) {
  const {
    onZoomIn,
    onZoomOut,
    onEscape,
    onToggleSearch,
    onNextMatch,
    onPrevMatch,
    enabled = true,
  } = options;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+F / Cmd+F for search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        onToggleSearch?.();
        return;
      }

      // F3 / Ctrl+G for next match, Shift+F3 / Ctrl+Shift+G for previous
      if (e.key === 'F3' || ((e.ctrlKey || e.metaKey) && e.key === 'g')) {
        e.preventDefault();
        if (e.shiftKey) {
          onPrevMatch?.();
        } else {
          onNextMatch?.();
        }
        return;
      }

      if (e.key === 'Escape') {
        onEscape?.();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '=')) {
        e.preventDefault();
        onZoomIn();
      } else if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault();
        onZoomOut();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    enabled,
    onZoomIn,
    onZoomOut,
    onEscape,
    onToggleSearch,
    onNextMatch,
    onPrevMatch,
  ]);
}
