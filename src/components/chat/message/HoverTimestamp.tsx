// src/components/chat/message/HoverTimestamp.tsx
// Floating hover timestamp rendered via portal so it always floats above
// every container (ChatDock, overflow wrappers, etc.).
// Style: Messenger-like dark pill with white text.

import { memo } from 'react';
import { createPortal } from 'react-dom';

interface HoverTimestampProps {
  /** Formatted time string */
  text: string;
  /** Anchor element (the bubble wrapper) for positioning */
  anchorEl: HTMLElement | null;
  /** true → message is right-aligned (own message) */
  alignRight: boolean;
}

function HoverTimestampBase({
  text,
  anchorEl,
  alignRight,
}: HoverTimestampProps) {
  if (!anchorEl) return null;

  const rect = anchorEl.getBoundingClientRect();

  // Position to the left of the bubble, vertically centered
  const style: React.CSSProperties = {
    position: 'fixed',
    top: rect.top + rect.height / 2,
    transform: 'translateY(-50%)',
    // Always show to the left of the bubble for both alignments
    ...(alignRight
      ? { right: window.innerWidth - rect.left - 6 }
      : { right: window.innerWidth - rect.left - 6 }),
    zIndex: 9999,
    pointerEvents: 'none',
    animation: 'tooltipIn 120ms cubic-bezier(0.4, 0, 0.2, 1) forwards',
  };

  return createPortal(
    <div
      style={style}
      className='select-none'
    >
      <span className='text-[10.5px] text-gray-200 whitespace-nowrap bg-gray-800/90 backdrop-blur-sm px-2.5 py-1 rounded-lg shadow-lg'>
        {text}
      </span>
    </div>,
    document.body,
  );
}

export const HoverTimestamp = memo(HoverTimestampBase);
