// src/components/chat/message/MessageBubble.tsx
// Chat message bubble component with correct alignment and shared avatar.
//
// Alignment rules (like standard messaging apps):
//   MY messages     → RIGHT, primary color (orange)
//   OTHER messages  → LEFT,  neutral color (white)
//   ASSISTANT       → LEFT,  neutral color (white), bot avatar
//
// `isOwnMessage` is the ONLY signal for alignment in collaborative mode,
// NOT `isUser` or `role`.

import { memo } from 'react';
import type { ReactNode } from 'react';
import { UserAvatar, AssistantAvatar } from '../../common/UserAvatar';
import { formatMessageTime } from '../../../utils/formatTimestamp';

interface MessageBubbleProps {
  /** true when msg.role === 'user' */
  isUser: boolean;
  children: ReactNode;
  /** Grouped with bubble above (same sender, close time) */
  isGrouped?: boolean;
  /** Display name for avatar / sender label */
  displayName?: string;
  /** Avatar URL from backend */
  avatarUrl?: string;
  /** ISO timestamp */
  timestamp?: string;
  /** Show the timestamp line */
  showTimestamp?: boolean;
  /** Collaborative session? (shows avatars + sender name) */
  isCollaborative?: boolean;
  /** This message belongs to the current user */
  isOwnMessage?: boolean;
}

function MessageBubbleBase({
  isUser,
  children,
  isGrouped = false,
  displayName,
  avatarUrl,
  timestamp,
  showTimestamp = false,
  isCollaborative = false,
  isOwnMessage = false,
}: MessageBubbleProps) {
  // ── Alignment ──────────────────────────────────────────────
  // In non-collaborative mode: user → right, assistant → left (classic single-paper chat)
  // In collaborative mode:     MY message → right, everything else → left
  const alignRight = isCollaborative ? isOwnMessage : isUser;

  // ── Avatar visibility ──────────────────────────────────────
  // Show avatar on the left for "other" messages (first in a group only).
  // In non-collaborative mode the assistant still gets a bot avatar.
  const isAssistant = !isUser;
  const showLeftAvatar = isCollaborative
    ? !alignRight && !isGrouped // other user or assistant, first in group
    : isAssistant && !isGrouped; // single-paper: assistant, first in group

  const spacing = isGrouped ? 'mb-0.5' : 'mb-4';

  return (
    <div
      className={`flex w-full ${spacing} ${alignRight ? 'justify-end' : 'justify-start'}`}
    >
      {/* ── Left avatar column ───────────────────────────────── */}
      {!alignRight && (
        <div className='w-7 mr-2 flex-shrink-0 flex flex-col items-center justify-end'>
          {showLeftAvatar &&
            (isAssistant ? (
              <AssistantAvatar size='sm' />
            ) : (
              <UserAvatar
                name={displayName}
                avatarUrl={avatarUrl}
                size='sm'
              />
            ))}
        </div>
      )}

      {/* ── Message column ───────────────────────────────────── */}
      <div
        className={`flex flex-col ${alignRight ? 'items-end' : 'items-start'} max-w-[90%] md:max-w-[85%]`}
      >
        {/* Sender name (collaborative, first in group, NOT own message) */}
        {isCollaborative && !isGrouped && !alignRight && displayName && (
          <span className='text-[11px] font-semibold text-gray-500 mb-0.5 ml-1'>
            {isAssistant ? 'Assistant' : displayName}
          </span>
        )}

        {/* Bubble */}
        <div
          className={`relative rounded-2xl px-4 py-2 shadow-sm border transition-all ${
            alignRight
              ? `bg-orange-500 text-white border-orange-500 ${
                  isGrouped ? 'rounded-tr-lg' : 'rounded-br-none'
                }`
              : `bg-white text-gray-800 border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] ${
                  isGrouped ? 'rounded-tl-lg' : 'rounded-bl-none'
                }`
          } ${!alignRight && !isCollaborative ? 'max-w-full' : ''}`}
        >
          {children}
        </div>

        {/* Timestamp */}
        {showTimestamp && timestamp && (
          <span className='text-[10px] text-gray-400 mt-0.5 mx-1 select-none'>
            {formatMessageTime(timestamp)}
          </span>
        )}
      </div>
    </div>
  );
}

export const MessageBubble = memo(MessageBubbleBase);
