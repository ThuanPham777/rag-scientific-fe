// src/components/chat/message/ReplyInputPreview.tsx
// Preview bar shown above the chat input when replying to a message

import { memo } from 'react';
import { X, CornerUpRight } from 'lucide-react';
import type { ChatMessage } from '../../../utils/types';

interface ReplyInputPreviewProps {
  message: ChatMessage;
  onCancel: () => void;
}

function ReplyInputPreviewBase({ message, onCancel }: ReplyInputPreviewProps) {
  const senderName =
    message.role === 'assistant' ? 'Assistant' : message.displayName || 'User';

  return (
    <div className='flex items-center gap-2 px-3 py-2 bg-orange-50 border-t border-orange-200'>
      <CornerUpRight
        size={14}
        className='text-orange-400 flex-shrink-0'
      />
      <div className='min-w-0 flex-1'>
        <p className='text-[11px] font-semibold text-orange-600'>
          Replying to {senderName}
        </p>
        <p className='text-xs text-gray-500 truncate'>
          {message.isDeleted ? 'This message was deleted' : message.content}
        </p>
      </div>
      <button
        type='button'
        onClick={onCancel}
        className='p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0'
      >
        <X size={14} />
      </button>
    </div>
  );
}

export const ReplyInputPreview = memo(ReplyInputPreviewBase);
