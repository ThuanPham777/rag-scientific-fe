// src/components/chat/message/MessageHoverActions.tsx
// Hover action toolbar shown on message hover (Reaction, Reply, Delete)

import { memo, useState, useCallback } from 'react';
import { SmilePlus, Reply, Trash2 } from 'lucide-react';
import { EmojiReactionPicker } from './EmojiReactionPicker';

interface MessageHoverActionsProps {
  /** Show on the right side (own message) */
  alignRight?: boolean;
  /** Is this an assistant message? (positions toolbar below) */
  isAssistant?: boolean;
  /** Can delete this message */
  canDelete?: boolean;
  /** Show reply action */
  canReply?: boolean;
  /** Render inline (no absolute positioning) — used when parent handles layout */
  inline?: boolean;
  /** Callbacks */
  onReact: (emoji: string) => void;
  onReply: () => void;
  onDelete: () => void;
}

function MessageHoverActionsBase({
  alignRight = false,
  isAssistant = false,
  canDelete = false,
  canReply = true,
  inline = false,
  onReact,
  onReply,
  onDelete,
}: MessageHoverActionsProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const handleReact = useCallback(
    (emoji: string) => {
      onReact(emoji);
      setShowEmojiPicker(false);
    },
    [onReact],
  );

  // Position toolbar based on message alignment:
  // Own messages (right): horizontal, to the LEFT of bubble
  // Other user messages (left): horizontal, to the RIGHT of bubble
  // Assistant messages: below the bubble, at bottom-left
  const positionClasses = inline
    ? '' // parent handles positioning
    : isAssistant
      ? 'absolute top-full mt-4 left-0'
      : alignRight
        ? 'absolute right-full mr-1 top-[50%] -translate-y-1/2'
        : 'absolute left-full ml-1 top-[50%] -translate-y-1/2';

  return (
    <div
      className={`${positionClasses} flex flex-row items-center gap-0.5 bg-white border border-gray-200 rounded-lg shadow-sm ${isAssistant || inline ? 'px-1 py-0.5' : 'px-0.5 py-1'} z-40 opacity-0 group-hover:opacity-100 transition-opacity duration-150`}
    >
      {/* Reaction button */}
      <div className='relative'>
        <button
          type='button'
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className='w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-orange-500 hover:bg-orange-50 transition-colors'
          title='React'
        >
          <SmilePlus size={14} />
        </button>
        {showEmojiPicker && (
          <EmojiReactionPicker
            onSelect={handleReact}
            onClose={() => setShowEmojiPicker(false)}
            alignRight={alignRight}
          />
        )}
      </div>

      {/* Reply button */}
      {canReply && (
        <button
          type='button'
          onClick={onReply}
          className='w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors'
          title='Reply'
        >
          <Reply size={14} />
        </button>
      )}

      {/* Delete button */}
      {canDelete && (
        <button
          type='button'
          onClick={onDelete}
          className='w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors'
          title='Delete'
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}

export const MessageHoverActions = memo(MessageHoverActionsBase);
