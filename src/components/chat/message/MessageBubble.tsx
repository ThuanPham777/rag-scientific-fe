// src/components/chat/message/MessageBubble.tsx
// Chat message bubble component

import { memo } from 'react';
import type { ReactNode } from 'react';

interface MessageBubbleProps {
  isUser: boolean;
  children: ReactNode;
}

/**
 * Styled message bubble container
 */
function MessageBubbleBase({ isUser, children }: MessageBubbleProps) {
  return (
    <div
      className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`relative max-w-[90%] md:max-w-[85%] rounded-2xl px-5 py-4 shadow-sm border transition-all ${
          isUser
            ? 'bg-orange-500 text-white border-orange-500 rounded-br-none'
            : 'bg-white text-gray-800 border-gray-200 rounded-bl-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]'
        }`}
      >
        {children}
      </div>
    </div>
  );
}

export const MessageBubble = memo(MessageBubbleBase);
