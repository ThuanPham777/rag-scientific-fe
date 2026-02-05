// Fullscreen hook - manages fullscreen state with body scroll lock
import { useState, useEffect, useCallback, useRef } from 'react';

export interface UseFullscreenOptions {
  onFullscreenChange?: (isFullscreen: boolean) => void;
}

export function usePdfFullscreen(options: UseFullscreenOptions = {}) {
  const { onFullscreenChange } = options;
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = useCallback(() => {
    const newState = !isFullscreen;
    setIsFullscreen(newState);
    onFullscreenChange?.(newState);
  }, [isFullscreen, onFullscreenChange]);

  const exitFullscreen = useCallback(() => {
    if (isFullscreen) {
      setIsFullscreen(false);
      onFullscreenChange?.(false);
    }
  }, [isFullscreen, onFullscreenChange]);

  // Exit fullscreen on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        exitFullscreen();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, exitFullscreen]);

  // Disable body scroll when fullscreen
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  return {
    isFullscreen,
    containerRef,
    toggleFullscreen,
    exitFullscreen,
  };
}
