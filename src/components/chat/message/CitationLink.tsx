// src/components/chat/message/CitationLink.tsx
// Inline citation link component

import { memo, useCallback } from 'react';

interface CitationLinkProps {
  citationId: string;
  fullMatch: string;
  onJump: (citationId: string) => void;
}

/**
 * Inline citation link that jumps to the source when clicked
 */
function CitationLinkBase({
  citationId,
  fullMatch,
  onJump,
}: CitationLinkProps) {
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onJump(citationId);
    },
    [citationId, onJump],
  );

  return (
    <button
      type='button'
      className='inline text-orange-600 font-medium hover:underline hover:text-orange-800 cursor-pointer text-xs align-baseline ml-0.5 px-0.5 rounded hover:bg-orange-50 transition-colors select-none'
      onClick={handleClick}
      title={`Jump to source ${citationId}`}
    >
      {fullMatch}
    </button>
  );
}

export const CitationLink = memo(CitationLinkBase);
