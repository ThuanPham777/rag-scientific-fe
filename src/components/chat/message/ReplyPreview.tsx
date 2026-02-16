// src/components/chat/message/ReplyPreview.tsx
// Compact preview of the message being replied to (shown inside a message bubble)

import { memo } from 'react';
import { CornerUpRight } from 'lucide-react';
import type { ReplyToMessage } from '../../../utils/types';

interface ReplyPreviewProps {
  replyTo: ReplyToMessage;
  onClickScroll?: (messageId: string) => void;
  /** Whether this is inside the current user's own message bubble (orange bg) */
  isOwnMessage?: boolean;
}

function ReplyPreviewBase({
  replyTo,
  onClickScroll,
  isOwnMessage = false,
}: ReplyPreviewProps) {
  return (
    <button
      type='button'
      onClick={() => onClickScroll?.(replyTo.id)}
      className={`flex items-start gap-1.5 w-full text-left mb-2 p-2 rounded-lg border-l-2 transition-colors cursor-pointer ${
        isOwnMessage
          ? 'bg-white/15 border-white/60 hover:bg-white/25'
          : 'bg-black/5 border-orange-400 hover:bg-black/10'
      }`}
    >
      <CornerUpRight
        size={12}
        className={`mt-0.5 flex-shrink-0 ${isOwnMessage ? 'text-white/70' : 'text-orange-400'}`}
      />
      <div className='min-w-0 flex-1'>
        <p
          className={`text-[10px] font-semibold leading-none mb-0.5 ${isOwnMessage ? 'text-white/80' : 'text-orange-600'}`}
        >
          {replyTo.role === 'ASSISTANT'
            ? 'Assistant'
            : replyTo.displayName || 'User'}
        </p>
        <p
          className={`text-xs leading-snug line-clamp-2 ${
            replyTo.isDeleted
              ? isOwnMessage
                ? 'italic text-white/50'
                : 'italic text-gray-400'
              : isOwnMessage
                ? 'text-white/80'
                : 'text-gray-600'
          }`}
        >
          {replyTo.content}
        </p>
      </div>
    </button>
  );
}

export const ReplyPreview = memo(ReplyPreviewBase);
