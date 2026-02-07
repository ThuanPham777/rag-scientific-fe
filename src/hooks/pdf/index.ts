// Export all PDF hooks
export { usePdfState } from './usePdfState';
export { usePdfZoom } from './usePdfZoom';
export { usePdfFullscreen } from './usePdfFullscreen';
export { usePdfSelectionActionMenu } from './usePdfSelectionActionMenu';
export { usePdfHighlightsSync } from './usePdfHighlightsSync';
export { usePdfSearch } from './usePdfSearch';
export { usePdfCapture } from './usePdfCapture';
export { usePdfJump, usePdfJumpEffect } from './usePdfJump';
export { usePdfKeyboard } from './usePdfKeyboard';

// Re-export types
export type {
  Selection,
  HighlightRect as SelectionRect,
} from './usePdfSelectionActionMenu';
export type {
  LocalHighlight,
  LocalHighlightRect,
} from './usePdfHighlightsSync';
export type { DragBox } from './usePdfCapture';
export type { JumpHighlight } from './usePdfJump';
