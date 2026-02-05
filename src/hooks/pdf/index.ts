// Export all PDF hooks
export { usePdfState } from './usePdfState';
export { usePdfZoom } from './usePdfZoom';
export { usePdfFullscreen } from './usePdfFullscreen';
export { usePdfSelection } from './usePdfSelection';
export { usePdfHighlights } from './usePdfHighlights';
export { usePdfSearch } from './usePdfSearch';
export { usePdfCapture } from './usePdfCapture';
export { usePdfJump, usePdfJumpEffect } from './usePdfJump';
export { usePdfKeyboard } from './usePdfKeyboard';

// Re-export types
export type {
  Selection,
  HighlightRect as SelectionRect,
} from './usePdfSelection';
export type { Highlight, HighlightRect } from './usePdfHighlights';
export type { DragBox } from './usePdfCapture';
export type { JumpHighlight } from './usePdfJump';
